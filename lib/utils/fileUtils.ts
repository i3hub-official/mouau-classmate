// lib/utils/fileUtils.ts
export class FileUtils {
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  static validateFileType(file: File, allowedTypes: string[]): boolean {
    if (allowedTypes.length === 0) return true;
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(extension);
  }

  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  static getFileIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'txt': '📄',
      'zip': '📦',
      'default': '📎'
    };

    const extension = type.split('.').pop()?.toLowerCase() || 'default';
    return icons[extension] || icons.default;
  }
}