import { readDir, putFile } from '@/api';

// 确保数据目录存在
export async function ensureDataDir(path: string) {
  try {
    // 尝试读取目录以检查是否存在
    await readDir(path);
  } catch (error) {
    // 如果目录不存在，则创建它（通过写入一个临时文件来创建目录）
    try {
      const tempFile = new Blob(['{}'], { type: 'application/json' });
      await putFile(path + '/.gitkeep', false, tempFile);
    } catch (err) {
      console.error('Error creating directory:', err);
    }
  }
}
