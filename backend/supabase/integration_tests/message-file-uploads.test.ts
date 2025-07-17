import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Database } from '../supabase';
import { 
  BACKEND_TEST_CONFIG,
  TEST_ORG_ID,
  TEST_ADMIN_USER,
  TEST_REGULAR_USER,
  generateTestName
} from './fixtures/testConfig';
import { 
  supabase, 
  authenticateTestUser, 
  signOutTestUser, 
  trackTestData, 
  cleanupTestData 
} from './setup';

describe('Message File Uploads Backend Integration', () => {
  let testChannelId: string;
  let testUserId: string;
  let uploadedFiles: string[] = [];

  beforeAll(async () => {
    const adminUser = await authenticateTestUser('admin');
    testUserId = adminUser.id;
    
    // Create test channel
    const channelName = generateTestName('test-ch-files-');
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        organization_id: TEST_ORG_ID,
        created_by: adminUser.id,
        type: 'public',
        description: 'Test channel for file upload testing'
      })
      .select()
      .single();
    
    if (channelError) throw channelError;
    testChannelId = channelData.id;
    trackTestData('channel', testChannelId);
  });

  afterAll(async () => {
    // Clean up uploaded files
    for (const filePath of uploadedFiles) {
      try {
        await supabase.storage
          .from('message-images')
          .remove([filePath]);
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    }
    
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clear uploaded files tracker
    uploadedFiles = [];
  });

  describe('Image Upload', () => {
    it('should upload image to message-images bucket', async () => {
      // Create test image file (minimal JPEG header)
      const imageBuffer = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
        0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
        0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
        0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
        0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F,
        0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28,
        0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF,
        0xD9 // End of image
      ]);
      
      const filename = `test-image-${Date.now()}.jpg`;
      const filePath = `${testUserId}/${filename}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, imageBuffer, {
          contentType: 'image/jpeg'
        });
      
      expect(uploadError).toBeNull();
      expect(uploadData?.path).toBe(filePath);
      
      uploadedFiles.push(filePath);
      
      // Verify file exists
      const { data: fileData, error: fileError } = await supabase.storage
        .from('message-images')
        .download(filePath);
      
      expect(fileError).toBeNull();
      expect(fileData).toBeDefined();
    });

    it('should create image message with metadata', async () => {
      // Upload image first
      const imageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
      const filename = `test-image-${Date.now()}.jpg`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, imageBuffer, {
          contentType: 'image/jpeg'
        });
      
      expect(uploadError).toBeNull();
      uploadedFiles.push(filePath);
      
      // Create message with image metadata
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Image message',
          message_type: 'image',
          metadata: {
            url: uploadData.path,
            filename: filename,
            size: imageBuffer.length,
            mimeType: 'image/jpeg',
            width: 800,
            height: 600
          }
        })
        .select()
        .single();
      
      expect(messageError).toBeNull();
      expect(messageData.message_type).toBe('image');
      expect(messageData.metadata).toMatchObject({
        url: uploadData.path,
        filename: filename,
        size: imageBuffer.length,
        mimeType: 'image/jpeg'
      });
    });

    it('should get public URL for image', async () => {
      // Upload image
      const imageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
      const filename = `test-image-${Date.now()}.jpg`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, imageBuffer, {
          contentType: 'image/jpeg'
        });
      
      expect(uploadError).toBeNull();
      uploadedFiles.push(filePath);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-images')
        .getPublicUrl(filePath);
      
      expect(urlData.publicUrl).toBeTruthy();
      expect(urlData.publicUrl).toContain(filePath);
    });
  });

  describe('Audio Upload', () => {
    it('should upload audio to message-audio bucket', async () => {
      // Create test audio file (minimal WAV header)
      const audioBuffer = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Chunk size
        0x01, 0x00, 0x01, 0x00, // Audio format, channels
        0x44, 0xAC, 0x00, 0x00, // Sample rate
        0x88, 0x58, 0x01, 0x00, // Byte rate
        0x02, 0x00, 0x10, 0x00, // Block align, bits per sample
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // Data size
      ]);
      
      const filename = `test-audio-${Date.now()}.wav`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-audio')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/wav'
        });
      
      expect(uploadError).toBeNull();
      expect(uploadData?.path).toBe(filePath);
      
      // Clean up
      await supabase.storage
        .from('message-audio')
        .remove([filePath]);
    });

    it('should create audio message with metadata', async () => {
      // Upload audio first
      const audioBuffer = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 
        0x57, 0x41, 0x56, 0x45, 0x64, 0x61, 0x74, 0x61, 
        0x00, 0x00, 0x00, 0x00
      ]);
      const filename = `test-audio-${Date.now()}.wav`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-audio')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/wav'
        });
      
      expect(uploadError).toBeNull();
      
      // Create message with audio metadata
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'Audio message',
          message_type: 'audio',
          metadata: {
            url: uploadData.path,
            filename: filename,
            size: audioBuffer.length,
            mimeType: 'audio/wav',
            duration: 1.5,
            waveform: [0.1, 0.5, 0.3, 0.8, 0.2]
          }
        })
        .select()
        .single();
      
      expect(messageError).toBeNull();
      expect(messageData.message_type).toBe('audio');
      expect(messageData.metadata).toMatchObject({
        url: uploadData.path,
        filename: filename,
        duration: 1.5
      });
      
      // Clean up
      await supabase.storage
        .from('message-audio')
        .remove([filePath]);
    });
  });

  describe('File Upload', () => {
    it('should upload file to message-files bucket', async () => {
      // Create test file
      const fileBuffer = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, // PDF header
        0x2D, 0x31, 0x2E, 0x34, // version
        0x0A, 0x25, 0xC4, 0xE5, // binary marker
        0x0A, 0x78, 0x72, 0x65, // content
        0x66, 0x0A, 0x30, 0x20 // more content
      ]);
      
      const filename = `test-file-${Date.now()}.pdf`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf'
        });
      
      expect(uploadError).toBeNull();
      expect(uploadData?.path).toBe(filePath);
      
      // Clean up
      await supabase.storage
        .from('message-files')
        .remove([filePath]);
    });

    it('should create file message with metadata', async () => {
      // Upload file first
      const fileBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]);
      const filename = `test-file-${Date.now()}.pdf`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, fileBuffer, {
          contentType: 'application/pdf'
        });
      
      expect(uploadError).toBeNull();
      
      // Create message with file metadata
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          channel_id: testChannelId,
          user_id: testUserId,
          content: 'File message',
          message_type: 'file',
          metadata: {
            url: uploadData.path,
            filename: filename,
            size: fileBuffer.length,
            mimeType: 'application/pdf'
          }
        })
        .select()
        .single();
      
      expect(messageError).toBeNull();
      expect(messageData.message_type).toBe('file');
      expect(messageData.metadata).toMatchObject({
        url: uploadData.path,
        filename: filename,
        mimeType: 'application/pdf'
      });
      
      // Clean up
      await supabase.storage
        .from('message-files')
        .remove([filePath]);
    });
  });

  describe('File Upload Validation', () => {
    it('should reject files exceeding size limit for images', async () => {
      // Create oversized image file (simulate 11MB)
      const oversizedBuffer = new Uint8Array(11 * 1024 * 1024);
      oversizedBuffer.fill(0xFF); // Fill with data
      
      const filename = `oversized-image-${Date.now()}.jpg`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('message-images')
        .upload(filePath, oversizedBuffer, {
          contentType: 'image/jpeg'
        });
      
      expect(error).toBeDefined();
      expect(error?.message).toContain('file size');
    });

    it('should reject invalid mime types for image bucket', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02]);
      const filename = `invalid-${Date.now()}.exe`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('message-images')
        .upload(filePath, invalidBuffer, {
          contentType: 'application/exe'
        });
      
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toContain('mime type');
    });

    it('should reject files exceeding size limit for audio', async () => {
      // Create oversized audio file (simulate 26MB)
      const oversizedBuffer = new Uint8Array(26 * 1024 * 1024);
      oversizedBuffer.fill(0xAA); // Fill with data
      
      const filename = `oversized-audio-${Date.now()}.wav`;
      const filePath = `${testUserId}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('message-audio')
        .upload(filePath, oversizedBuffer, {
          contentType: 'audio/wav'
        });
      
      expect(error).toBeDefined();
      expect(error?.message).toContain('file size');
    });
  });

  describe('Storage Policies', () => {
    it('should only allow users to upload to their own folder', async () => {
      const adminUser = await authenticateTestUser('admin');
      const regularUser = await authenticateTestUser('user');
      
      // Try to upload to admin's folder as regular user
      const imageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
      const filename = `unauthorized-${Date.now()}.jpg`;
      const unauthorizedPath = `${adminUser.id}/${filename}`;
      
      const { data, error } = await supabase.storage
        .from('message-images')
        .upload(unauthorizedPath, imageBuffer, {
          contentType: 'image/jpeg'
        });
      
      // Should be blocked by RLS policy
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toContain('permission');
    });

    it('should allow users to read files from public buckets', async () => {
      const adminUser = await authenticateTestUser('admin');
      
      // Upload as admin
      const imageBuffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9]);
      const filename = `public-read-${Date.now()}.jpg`;
      const filePath = `${adminUser.id}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(filePath, imageBuffer, {
          contentType: 'image/jpeg'
        });
      
      expect(uploadError).toBeNull();
      
      // Switch to regular user and try to read
      const regularUser = await authenticateTestUser('user');
      
      const { data: urlData } = supabase.storage
        .from('message-images')
        .getPublicUrl(filePath);
      
      // Should be able to get public URL
      expect(urlData.publicUrl).toBeTruthy();
      
      // Clean up
      await authenticateTestUser('admin');
      await supabase.storage
        .from('message-images')
        .remove([filePath]);
    });
  });
});