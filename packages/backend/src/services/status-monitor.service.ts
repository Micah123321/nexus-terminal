import { Client } from 'ssh2';
import { WebSocket } from 'ws';
import { ClientState } from '../websocket';
import { settingsService } from '../settings/settings.service';

interface ServerStatus {
    cpuPercent?: number;
    memPercent?: number;
    memUsed?: number; // MB
    memTotal?: number; // MB
    memFree?: number; // MB
    memCached?: number; // MB
    swapPercent?: number;
    swapUsed?: number; // MB
    swapTotal?: number; // MB
    diskPercent?: number;
    diskUsed?: number; // KB
    diskTotal?: number; // KB
    diskAvailable?: number; // KB
    diskMountPoint?: string;
    diskFsType?: string;
    diskDevice?: string;
    diskReadRate?: number; // Bytes per second
    diskWriteRate?: number; // Bytes per second
    cpuModel?: string;
    netRxRate?: number; // Bytes per second
    netTxRate?: number; // Bytes per second
    netRxTotalBytes?: number; // Bytes since boot
    netTxTotalBytes?: number; // Bytes since boot
    netInterface?: string;
    osName?: string;
    loadAvg?: number[];
    timestamp: number;
}

interface NetworkStats {
    [interfaceName: string]: {
        rx_bytes: number;
        tx_bytes: number;
    };
}

interface DiskIoStats {
    [deviceName: string]: {
        readBytes: number;
        writeBytes: number;
    };
}

const previousNetStats = new Map<string, { rx: number; tx: number; timestamp: number }>();
const previousDiskStats = new Map<string, { device: string; readBytes: number; writeBytes: number; timestamp: number }>();

export class StatusMonitorService {
    private clientStates: Map<string, ClientState>;
    private previousCpuStats = new Map<string, { total: number; idle: number; timestamp: number }>();

    constructor(clientStates: Map<string, ClientState>) {
        this.clientStates = clientStates;
    }

    async startStatusPolling(sessionId: string): Promise<void> {
        const state = this.clientStates.get(sessionId);
        if (!state || !state.sshClient || state.statusIntervalId) {
            return;
        }

        let intervalMs = 3000;
        try {
            const intervalSeconds = await settingsService.getStatusMonitorIntervalSeconds();
            intervalMs = intervalSeconds * 1000;
            console.log(`[StatusMonitor ${sessionId}] 使用配置的轮询间隔: ${intervalSeconds} 秒 (${intervalMs}ms)`);
        } catch (error) {
            console.error(`[StatusMonitor ${sessionId}] 获取轮询间隔设置失败，将使用默认值 3000ms:`, error);
        }

        state.statusIntervalId = setInterval(() => {
            this.fetchAndSendServerStatus(sessionId);
        }, intervalMs);
    }

    stopStatusPolling(sessionId: string): void {
        const state = this.clientStates.get(sessionId);
        if (!state?.statusIntervalId) {
            return;
        }

        clearInterval(state.statusIntervalId);
        state.statusIntervalId = undefined;
        previousNetStats.delete(sessionId);
        previousDiskStats.delete(sessionId);
        this.previousCpuStats.delete(sessionId);
    }

    private async fetchAndSendServerStatus(sessionId: string): Promise<void> {
        const state = this.clientStates.get(sessionId);
        if (!state || !state.sshClient || state.ws.readyState !== WebSocket.OPEN) {
            this.stopStatusPolling(sessionId);
            return;
        }

        try {
            const status = await this.fetchServerStatus(state.sshClient, sessionId);
            state.ws.send(JSON.stringify({ type: 'status_update', payload: { connectionId: state.dbConnectionId, status } }));
        } catch (error: any) {
            state.ws.send(JSON.stringify({
                type: 'status_error',
                payload: { connectionId: state.dbConnectionId, message: `获取状态失败: ${error.message}` },
            }));
        }
    }

    private async fetchServerStatus(sshClient: Client, sessionId: string): Promise<ServerStatus> {
        const timestamp = Date.now();
        const status: Partial<ServerStatus> = { timestamp };

        try {
            try {
                const osReleaseOutput = await this.executeSshCommand(sshClient, 'cat /etc/os-release');
                const nameMatch = osReleaseOutput.match(/^PRETTY_NAME="?([^"]+)"?/m);
                status.osName = nameMatch ? nameMatch[1] : (osReleaseOutput.match(/^NAME="?([^"]+)"?/m)?.[1] ?? 'Unknown');
            } catch (err) { /* noop */ }

            try {
                let cpuModelOutput = '';
                try {
                    cpuModelOutput = await this.executeSshCommand(sshClient, "cat /proc/cpuinfo | grep 'model name' | head -n 1");
                    status.cpuModel = cpuModelOutput.match(/model name\s*:\s*(.*)/i)?.[1].trim();
                } catch (procErr) {
                    cpuModelOutput = await this.executeSshCommand(sshClient, "lscpu | grep 'Model name:'");
                    status.cpuModel = cpuModelOutput.match(/Model name:\s+(.*)/)?.[1].trim();
                }
                if (!status.cpuModel) {
                    status.cpuModel = 'Unknown';
                }
            } catch (err) {
                status.cpuModel = 'Unknown';
            }

            await this.collectMemoryStatus(sshClient, status);
            await this.collectDiskStatus(sshClient, sessionId, timestamp, status);

            try {
                const procStatOutput = await this.executeSshCommand(sshClient, 'cat /proc/stat');
                const currentCpuTimes = this.parseProcStat(procStatOutput);
                const now = Date.now();

                if (currentCpuTimes) {
                    const prevCpuStats = this.previousCpuStats.get(sessionId);
                    if (prevCpuStats && prevCpuStats.timestamp < now) {
                        const totalDiff = currentCpuTimes.total - prevCpuStats.total;
                        const idleDiff = currentCpuTimes.idle - prevCpuStats.idle;
                        const timeDiffMs = now - prevCpuStats.timestamp;

                        if (totalDiff > 0 && timeDiffMs > 100) {
                            const usageRatio = 1.0 - (idleDiff / totalDiff);
                            status.cpuPercent = parseFloat((Math.max(0, Math.min(100, usageRatio * 100))).toFixed(1));
                        } else {
                            status.cpuPercent = prevCpuStats.total > 0 ? status.cpuPercent : 0;
                        }
                    } else {
                        status.cpuPercent = 0;
                    }

                    this.previousCpuStats.set(sessionId, { ...currentCpuTimes, timestamp: now });
                }
            } catch (err) {
                status.cpuPercent = undefined;
            }

            try {
                const uptimeOutput = await this.executeSshCommand(sshClient, 'uptime');
                const match = uptimeOutput.match(/load average(?:s)?:\s*([\d.]+)[, ]?\s*([\d.]+)[, ]?\s*([\d.]+)/);
                if (match) {
                    status.loadAvg = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }
            } catch (err) { /* noop */ }

            await this.collectNetworkStatus(sshClient, sessionId, timestamp, status);
        } catch (error) {
            console.error(`[StatusMonitor ${sessionId}] General error fetching server status:`, error);
        }

        return status as ServerStatus;
    }

    private async collectMemoryStatus(sshClient: Client, status: Partial<ServerStatus>): Promise<void> {
        try {
            let freeCommand = 'free -m';
            let isBusyBox = false;
            try {
                const busyboxCheck = await this.executeSshCommand(sshClient, 'busybox --help');
                if (busyboxCheck.includes('BusyBox')) {
                    freeCommand = 'free';
                    isBusyBox = true;
                }
            } catch (err) { /* noop */ }

            const normalizeMemory = (value: number): number => isBusyBox ? Math.round(value / 1024) : value;
            const freeOutput = await this.executeSshCommand(sshClient, freeCommand);
            const lines = freeOutput.split('\n');
            const headerLine = lines.find(line => line.toLowerCase().includes('total') && line.toLowerCase().includes('used'));
            const memLine = lines.find(line => line.startsWith('Mem:'));
            const swapLine = lines.find(line => line.startsWith('Swap:'));

            if (memLine && headerLine) {
                const headers = headerLine.trim().split(/\s+/);
                const values = memLine.trim().split(/\s+/).slice(1);
                const memoryFields: Record<string, number> = {};

                headers.forEach((header, index) => {
                    const rawValue = parseInt(values[index], 10);
                    if (!isNaN(rawValue)) {
                        memoryFields[header.toLowerCase()] = normalizeMemory(rawValue);
                    }
                });

                const totalVal = memoryFields.total;
                const usedVal = memoryFields.used;
                const freeVal = memoryFields.free;
                const cachedVal = memoryFields['buff/cache'] ?? ((memoryFields.buffers ?? 0) + (memoryFields.cached ?? 0));

                if (!isNaN(totalVal) && !isNaN(usedVal)) {
                    status.memTotal = totalVal;
                    status.memUsed = usedVal;
                    status.memPercent = totalVal > 0 ? parseFloat(((usedVal / totalVal) * 100).toFixed(1)) : 0;
                    status.memFree = !isNaN(freeVal) ? freeVal : Math.max(totalVal - usedVal - (cachedVal || 0), 0);
                    if (cachedVal > 0) {
                        status.memCached = cachedVal;
                    }
                }
            } else if (memLine) {
                const parts = memLine.split(/\s+/);
                if (parts.length >= 4) {
                    const totalVal = normalizeMemory(parseInt(parts[1], 10));
                    const usedVal = normalizeMemory(parseInt(parts[2], 10));
                    const freeVal = normalizeMemory(parseInt(parts[3], 10));

                    if (!isNaN(totalVal) && !isNaN(usedVal)) {
                        status.memTotal = totalVal;
                        status.memUsed = usedVal;
                        status.memFree = !isNaN(freeVal) ? freeVal : undefined;
                        status.memPercent = totalVal > 0 ? parseFloat(((usedVal / totalVal) * 100).toFixed(1)) : 0;
                    }
                }
            }

            if (swapLine) {
                const parts = swapLine.split(/\s+/);
                if (parts.length >= 3) {
                    const totalVal = normalizeMemory(parseInt(parts[1], 10));
                    const usedVal = normalizeMemory(parseInt(parts[2], 10));
                    if (!isNaN(totalVal) && !isNaN(usedVal)) {
                        status.swapTotal = totalVal;
                        status.swapUsed = usedVal;
                        status.swapPercent = totalVal > 0 ? parseFloat(((usedVal / totalVal) * 100).toFixed(1)) : 0;
                    }
                }
            } else {
                status.swapTotal = 0;
                status.swapUsed = 0;
                status.swapPercent = 0;
            }
        } catch (err) { /* noop */ }
    }

    private async collectDiskStatus(
        sshClient: Client,
        sessionId: string,
        timestamp: number,
        status: Partial<ServerStatus>,
    ): Promise<void> {
        try {
            let dfOutput = '';
            try {
                dfOutput = await this.executeSshCommand(sshClient, 'df -kPT /');
            } catch (err) {
                dfOutput = await this.executeSshCommand(sshClient, 'df -kP /');
            }

            let rawDiskDevice: string | undefined;
            if (dfOutput) {
                const lines = dfOutput.split('\n');
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line.endsWith(' /')) {
                        continue;
                    }

                    const parts = line.split(/\s+/);
                    const hasTypeColumn = parts.length >= 7;
                    const totalIndex = hasTypeColumn ? 2 : 1;
                    const usedIndex = hasTypeColumn ? 3 : 2;
                    const availableIndex = hasTypeColumn ? 4 : 3;
                    const percentIndex = hasTypeColumn ? 5 : 4;
                    const mountIndex = hasTypeColumn ? 6 : 5;
                    const total = parseInt(parts[totalIndex], 10);
                    const used = parseInt(parts[usedIndex], 10);
                    const available = parseInt(parts[availableIndex], 10);
                    const percentMatch = parts[percentIndex]?.match(/(\d+)%/);

                    if (!isNaN(total) && !isNaN(used) && !isNaN(available) && percentMatch?.[1]) {
                        rawDiskDevice = parts[0];
                        status.diskFsType = hasTypeColumn ? parts[1] : status.diskFsType;
                        status.diskTotal = total;
                        status.diskUsed = used;
                        status.diskAvailable = available;
                        status.diskPercent = parseFloat(percentMatch[1]);
                        status.diskMountPoint = parts[mountIndex] || '/';
                        break;
                    }
                }
            }

            if (!rawDiskDevice || !status.diskFsType || !status.diskMountPoint) {
                try {
                    const findmntOutput = await this.executeSshCommand(sshClient, 'findmnt -n -o SOURCE,FSTYPE,TARGET /');
                    const findmntParts = findmntOutput.trim().split(/\s+/);
                    rawDiskDevice = rawDiskDevice || findmntParts[0];
                    status.diskFsType = status.diskFsType || findmntParts[1];
                    status.diskMountPoint = status.diskMountPoint || findmntParts[2] || '/';
                } catch (err) { /* noop */ }
            }

            status.diskDevice = this.normalizeDiskDevice(rawDiskDevice);
            if (!status.diskDevice) {
                return;
            }

            const currentDiskStats = await this.parseProcDiskStats(sshClient);
            const deviceStats = currentDiskStats?.[status.diskDevice];
            if (!deviceStats) {
                return;
            }

            const previousStats = previousDiskStats.get(sessionId);
            if (previousStats && previousStats.device === status.diskDevice && previousStats.timestamp < timestamp) {
                const timeDiffSeconds = (timestamp - previousStats.timestamp) / 1000;
                if (timeDiffSeconds > 0.1) {
                    status.diskReadRate = Math.max(0, Math.round((deviceStats.readBytes - previousStats.readBytes) / timeDiffSeconds));
                    status.diskWriteRate = Math.max(0, Math.round((deviceStats.writeBytes - previousStats.writeBytes) / timeDiffSeconds));
                } else {
                    status.diskReadRate = 0;
                    status.diskWriteRate = 0;
                }
            } else {
                status.diskReadRate = 0;
                status.diskWriteRate = 0;
            }

            previousDiskStats.set(sessionId, {
                device: status.diskDevice,
                readBytes: deviceStats.readBytes,
                writeBytes: deviceStats.writeBytes,
                timestamp,
            });
        } catch (err) { /* noop */ }
    }

    private async collectNetworkStatus(
        sshClient: Client,
        sessionId: string,
        timestamp: number,
        status: Partial<ServerStatus>,
    ): Promise<void> {
        try {
            const currentStats = await this.parseProcNetDev(sshClient);
            if (!currentStats) {
                return;
            }

            const defaultInterface = await this.getDefaultInterface(sshClient) || Object.keys(currentStats).find(iface => iface !== 'lo');
            if (!defaultInterface || !currentStats[defaultInterface]) {
                return;
            }

            status.netInterface = defaultInterface;
            const currentRx = currentStats[defaultInterface].rx_bytes;
            const currentTx = currentStats[defaultInterface].tx_bytes;
            status.netRxTotalBytes = currentRx;
            status.netTxTotalBytes = currentTx;

            const prevStats = previousNetStats.get(sessionId);
            if (prevStats && prevStats.timestamp < timestamp) {
                const timeDiffSeconds = (timestamp - prevStats.timestamp) / 1000;
                if (timeDiffSeconds > 0.1) {
                    status.netRxRate = Math.max(0, Math.round((currentRx - prevStats.rx) / timeDiffSeconds));
                    status.netTxRate = Math.max(0, Math.round((currentTx - prevStats.tx) / timeDiffSeconds));
                } else {
                    status.netRxRate = 0;
                    status.netTxRate = 0;
                }
            } else {
                status.netRxRate = 0;
                status.netTxRate = 0;
            }

            previousNetStats.set(sessionId, { rx: currentRx, tx: currentTx, timestamp });
        } catch (err) { /* noop */ }
    }

    private async parseProcNetDev(sshClient: Client): Promise<NetworkStats | null> {
        try {
            const output = await this.executeSshCommand(sshClient, 'cat /proc/net/dev');
            const stats: NetworkStats = {};

            for (const line of output.split('\n').slice(2)) {
                const parts = line.trim().split(/:\s+|\s+/);
                if (parts.length < 17) continue;

                const interfaceName = parts[0];
                const rx_bytes = parseInt(parts[1], 10);
                const tx_bytes = parseInt(parts[9], 10);
                if (!isNaN(rx_bytes) && !isNaN(tx_bytes)) {
                    stats[interfaceName] = { rx_bytes, tx_bytes };
                }
            }

            return Object.keys(stats).length > 0 ? stats : null;
        } catch (error) {
            return null;
        }
    }

    private async parseProcDiskStats(sshClient: Client): Promise<DiskIoStats | null> {
        try {
            const output = await this.executeSshCommand(sshClient, 'cat /proc/diskstats');
            const stats: DiskIoStats = {};

            for (const line of output.split('\n')) {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 10) continue;

                const deviceName = parts[2];
                const sectorsRead = parseInt(parts[5], 10);
                const sectorsWritten = parseInt(parts[9], 10);
                if (!isNaN(sectorsRead) && !isNaN(sectorsWritten)) {
                    stats[deviceName] = {
                        readBytes: sectorsRead * 512,
                        writeBytes: sectorsWritten * 512,
                    };
                }
            }

            return Object.keys(stats).length > 0 ? stats : null;
        } catch (error) {
            return null;
        }
    }

    private async getDefaultInterface(sshClient: Client): Promise<string | null> {
        try {
            const output = await this.executeSshCommand(sshClient, "ip route get 1.1.1.1 | grep -oP 'dev\\s+\\K\\S+'");
            const interfaceName = output.trim();
            if (interfaceName) {
                return interfaceName;
            }
        } catch (error) {
            try {
                const netDevOutput = await this.executeSshCommand(sshClient, 'cat /proc/net/dev');
                for (const line of netDevOutput.split('\n').slice(2)) {
                    const iface = line.trim().split(':')[0];
                    if (iface && iface !== 'lo') {
                        return iface;
                    }
                }
            } catch (fallbackError) {
                return null;
            }
        }

        return null;
    }

    private normalizeDiskDevice(rawDevice?: string): string | undefined {
        if (!rawDevice) {
            return undefined;
        }

        let normalized = rawDevice.trim();
        if (!normalized) {
            return undefined;
        }

        if (normalized.startsWith('/dev/')) {
            normalized = normalized.slice(5);
        }

        if (/^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|hd[a-z]+)\d+$/.test(normalized)) {
            return normalized.replace(/\d+$/, '');
        }

        if (/^(nvme\d+n\d+|mmcblk\d+)p\d+$/.test(normalized)) {
            return normalized.replace(/p\d+$/, '');
        }

        return normalized;
    }

    private executeSshCommand(sshClient: Client, command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            let output = '';
            sshClient.exec(command, (err, stream) => {
                if (err) {
                    return reject(new Error(`执行命令 '${command}' 失败: ${err.message}`));
                }

                stream
                    .on('close', () => resolve(output.trim()))
                    .on('data', (data: Buffer) => {
                        output += data.toString('utf8');
                    })
                    .stderr.on('data', () => {
                        return;
                    });
            });
        });
    }

    private parseProcStat(output: string): { total: number; idle: number } | null {
        try {
            const cpuLine = output.split('\n').find(line => line.startsWith('cpu '));
            if (!cpuLine) {
                return null;
            }

            const fields = cpuLine.trim().split(/\s+/).slice(1).map(Number);
            if (fields.length < 4 || fields.slice(0, 4).some(isNaN)) {
                return null;
            }

            const idle = fields[3];
            const total = fields.reduce((sum, value) => sum + (isNaN(value) ? 0 : value), 0);
            if (isNaN(total) || isNaN(idle)) {
                return null;
            }

            return { total, idle };
        } catch (e) {
            return null;
        }
    }
}
