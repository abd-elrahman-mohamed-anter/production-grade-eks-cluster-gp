import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = util.promisify(exec);

export const niktoService = {
  async scan(url: string, scanType: string) {
    if (scanType === 'shallow') return { vulnerabilities: [] };

    // بنعمل ملف مؤقت نحفظ فيه نتيجة Nikto بصيغة JSON
    const outputFile = path.join('/tmp', `nikto_${Date.now()}.json`);
    let command = '';
    
    if (scanType === 'medium') {
      command = `nikto -h ${url} -Tuning 123b -maxtime 5m -Format json -o ${outputFile}`;
    } else {
      command = `nikto -h ${url} -maxtime 15m -Format json -o ${outputFile}`;
    }

    try {
      // بنستخدم catch لأن Nikto لو لقى ثغرة بيعمل Exit Code يعطي ايرور في Node.js
      await execPromise(command).catch(e => e); 

      if (fs.existsSync(outputFile)) {
        const fileContent = fs.readFileSync(outputFile, 'utf8');
        fs.unlinkSync(outputFile); // نمسح الملف بعد القراءة
        
        const parsed = JSON.parse(fileContent);
        const vulnerabilities = parsed.vulnerabilities?.map((v: any) => ({
          msg: v.msg,
          uri: v.url,
          id: v.id,
          method: v.method
        })) || [];

        return { vulnerabilities };
      }
      
      return { vulnerabilities: [] };
    } catch (error) {
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      throw new Error(`Nikto scan failed: ${error}`);
    }
  }
};
