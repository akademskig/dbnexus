/**
 * Simple encryption for storing passwords in the database
 * Uses AES-256-GCM with a machine-specific key
 */

import * as crypto from 'crypto';
import * as os from 'os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Generate a deterministic encryption key based on machine identity
 * In production, you'd want to use OS keychain or a proper secret manager
 */
function getEncryptionKey(): Buffer {
    const machineId = `${os.hostname()}-${os.userInfo().username}-dbnexus`;
    return crypto.createHash('sha256').update(machineId).digest();
}

/**
 * Encrypt a password
 */
export function encryptPassword(password: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a password
 */
export function decryptPassword(encryptedData: string): string {
    const key = getEncryptionKey();

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0]!, 'hex');
    const authTag = Buffer.from(parts[1]!, 'hex');
    const encrypted = parts[2]!;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
