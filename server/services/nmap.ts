import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const nmapService = {
  async scan(hostname: string, scanType: string) {
    let command = '';
    let timeoutMs = 60000; // دقيقة واحدة كافتراضي
    
    if (scanType === 'medium') {
      command = `nmap -F -T4 ${hostname}`;
      timeoutMs = 120000; // دقيقتين
    } else if (scanType === 'deep') {
      command = `nmap -p- -sV -T4 ${hostname}`;
      timeoutMs = 600000; // 10 دقايق للـ Deep
    } else {
      return { openPorts: [], rawOutput: "Skipped" };
    }

    try {
      // تطبيق الـ timeout
      const { stdout } = await execPromise(command, { timeout: timeoutMs });
      const openPorts: any[] = [];
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('open') && line.includes('/')) {
          const parts = line.trim().split(/\s+/);
          const portProto = parts[0].split('/');
          
          openPorts.push({
            port: parseInt(portProto[0], 10),
            protocol: portProto[1],
            service: parts.slice(2).join(' ')
          });
        }
      }

      return { openPorts, rawOutput: stdout };
    } catch (error: any) {
      if (error.stdout) {
        return { openPorts: [], rawOutput: error.stdout };
      }
      throw new Error(`Nmap scan failed or timed out: ${error}`);
    }
  }
};
