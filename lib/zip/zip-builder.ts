/**
 * Low-level ZIP file construction utilities
 * Modularized from the original monolithic zip-creator
 */

import { ZipFileEntry } from './zip-file-manager';

export interface ZipLocalFileHeader {
  signature: number;
  version: number;
  flags: number;
  compression: number;
  modTime: number;
  modDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  filenameLength: number;
  extraLength: number;
}

export interface ZipCentralDirEntry {
  signature: number;
  versionMadeBy: number;
  versionNeeded: number;
  flags: number;
  compression: number;
  modTime: number;
  modDate: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  filenameLength: number;
  extraLength: number;
  commentLength: number;
  diskNumber: number;
  internalAttribs: number;
  externalAttribs: number;
  localHeaderOffset: number;
}

export class ZipBuilder {
  private crcTable: number[] | null = null;

  /**
   * Creates a ZIP file from organized file entries
   */
  async createZipBuffer(files: ZipFileEntry[]): Promise<ArrayBuffer> {
    const zipData: ArrayBuffer[] = [];
    const centralDirectory: ArrayBuffer[] = [];
    let offset = 0;

    // Process each file
    for (const file of files) {
      const { localHeader, fileData, centralEntry } = await this.processFile(file, offset);

      zipData.push(localHeader, fileData);
      centralDirectory.push(centralEntry);

      offset += localHeader.byteLength + fileData.byteLength;
    }

    // Create end of central directory
    const endOfCentral = this.createEndOfCentralDirectory(files, centralDirectory, offset);

    // Combine all parts
    return this.combineZipParts(zipData, centralDirectory, endOfCentral);
  }

  /**
   * Processes a single file for ZIP inclusion
   */
  private async processFile(
    file: ZipFileEntry,
    offset: number
  ): Promise<{
    localHeader: ArrayBuffer;
    fileData: ArrayBuffer;
    centralEntry: ArrayBuffer;
  }> {
    const filename = new TextEncoder().encode(file.name);
    const fileData = file.data;
    const crc32Value = this.calculateCRC32(new Uint8Array(fileData));

    // Create local file header
    const localHeader = this.createLocalFileHeader({
      signature: 0x04034b50,
      version: 20,
      flags: 0,
      compression: 0, // No compression (stored)
      modTime: 0,
      modDate: 0,
      crc32: crc32Value,
      compressedSize: fileData.byteLength,
      uncompressedSize: fileData.byteLength,
      filenameLength: filename.length,
      extraLength: 0
    }, filename);

    // Create central directory entry
    const centralEntry = this.createCentralDirectoryEntry({
      signature: 0x02014b50,
      versionMadeBy: 20,
      versionNeeded: 20,
      flags: 0,
      compression: 0,
      modTime: 0,
      modDate: 0,
      crc32: crc32Value,
      compressedSize: fileData.byteLength,
      uncompressedSize: fileData.byteLength,
      filenameLength: filename.length,
      extraLength: 0,
      commentLength: 0,
      diskNumber: 0,
      internalAttribs: 0,
      externalAttribs: 0,
      localHeaderOffset: offset
    }, filename);

    return { localHeader, fileData, centralEntry };
  }

  /**
   * Creates local file header
   */
  private createLocalFileHeader(header: ZipLocalFileHeader, filename: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(30 + filename.length);
    const view = new DataView(buffer);

    view.setUint32(0, header.signature, true);
    view.setUint16(4, header.version, true);
    view.setUint16(6, header.flags, true);
    view.setUint16(8, header.compression, true);
    view.setUint16(10, header.modTime, true);
    view.setUint16(12, header.modDate, true);
    view.setUint32(14, header.crc32, true);
    view.setUint32(18, header.compressedSize, true);
    view.setUint32(22, header.uncompressedSize, true);
    view.setUint16(26, header.filenameLength, true);
    view.setUint16(28, header.extraLength, true);

    // Copy filename
    new Uint8Array(buffer, 30).set(filename);

    return buffer;
  }

  /**
   * Creates central directory entry
   */
  private createCentralDirectoryEntry(entry: ZipCentralDirEntry, filename: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(46 + filename.length);
    const view = new DataView(buffer);

    view.setUint32(0, entry.signature, true);
    view.setUint16(4, entry.versionMadeBy, true);
    view.setUint16(6, entry.versionNeeded, true);
    view.setUint16(8, entry.flags, true);
    view.setUint16(10, entry.compression, true);
    view.setUint16(12, entry.modTime, true);
    view.setUint16(14, entry.modDate, true);
    view.setUint32(16, entry.crc32, true);
    view.setUint32(20, entry.compressedSize, true);
    view.setUint32(24, entry.uncompressedSize, true);
    view.setUint16(28, entry.filenameLength, true);
    view.setUint16(30, entry.extraLength, true);
    view.setUint16(32, entry.commentLength, true);
    view.setUint16(34, entry.diskNumber, true);
    view.setUint16(36, entry.internalAttribs, true);
    view.setUint32(38, entry.externalAttribs, true);
    view.setUint32(42, entry.localHeaderOffset, true);

    // Copy filename
    new Uint8Array(buffer, 46).set(filename);

    return buffer;
  }

  /**
   * Creates end of central directory record
   */
  private createEndOfCentralDirectory(
    files: ZipFileEntry[],
    centralDirectory: ArrayBuffer[],
    offset: number
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(22);
    const view = new DataView(buffer);
    const centralSize = centralDirectory.reduce((sum, entry) => sum + entry.byteLength, 0);

    view.setUint32(0, 0x06054b50, true); // End of central directory signature
    view.setUint16(4, 0, true); // Number of this disk
    view.setUint16(6, 0, true); // Disk where central directory starts
    view.setUint16(8, files.length, true); // Number of central directory entries on this disk
    view.setUint16(10, files.length, true); // Total number of central directory entries
    view.setUint32(12, centralSize, true); // Size of central directory
    view.setUint32(16, offset, true); // Offset of central directory
    view.setUint16(20, 0, true); // Comment length

    return buffer;
  }

  /**
   * Combines all ZIP parts into final buffer
   */
  private combineZipParts(
    zipData: ArrayBuffer[],
    centralDirectory: ArrayBuffer[],
    endOfCentral: ArrayBuffer
  ): ArrayBuffer {
    const totalSize = [
      ...zipData,
      ...centralDirectory,
      endOfCentral
    ].reduce((sum, buffer) => sum + buffer.byteLength, 0);

    const result = new ArrayBuffer(totalSize);
    const resultView = new Uint8Array(result);
    let position = 0;

    // Copy file data
    for (const data of zipData) {
      resultView.set(new Uint8Array(data), position);
      position += data.byteLength;
    }

    // Copy central directory
    for (const entry of centralDirectory) {
      resultView.set(new Uint8Array(entry), position);
      position += entry.byteLength;
    }

    // Copy end of central directory
    resultView.set(new Uint8Array(endOfCentral), position);

    return result;
  }

  /**
   * Calculates CRC32 checksum
   */
  private calculateCRC32(data: Uint8Array): number {
    if (!this.crcTable) {
      this.crcTable = this.generateCRCTable();
    }

    let crc = 0 ^ (-1);

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.crcTable[(crc ^ data[i]) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
  }

  /**
   * Generates CRC32 lookup table
   */
  private generateCRCTable(): number[] {
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c;
    }
    return table;
  }
}