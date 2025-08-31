
import apiClient from './apiService.js';
import axios from 'axios';

// S3 Presigned URL 단건 요청
export const getPresignedUrl = async (imageExtension, filePath = 'board') => {
  try {
    const response = await apiClient.get('/upload/s3/presignedUrl', {
      params: {
        imageExtension,
        filePath
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Presigned URL 요청 실패: ${error.message}`);
  }
};

// S3 Presigned URL 다중 요청
export const getPresignedUrls = async (extensions, filePath = 'board') => {
  try {
    const response = await apiClient.post('/upload/s3/presignedUrls', extensions, {
      params: {
        filePath
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Presigned URLs 요청 실패: ${error.message}`);
  }
};

// 이미지 파일을 S3에 업로드
export const uploadImageToS3 = async (presignedUrl, file) => {
  try {
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
    return { success: true };
  } catch (error) {
    throw new Error(`S3 이미지 업로드 실패: ${error.message}`);
  }
};

// DB에 이미지 정보 저장 (단건)
export const saveImageToDB = async (imageData) => {
  try {
    const response = await apiClient.post('/images', imageData);
    return response.data;
  } catch (error) {
    throw new Error(`이미지 DB 저장 실패: ${error.message}`);
  }
};

// DB에 이미지 정보 저장 (다중)
export const saveMultipleImagesToDB = async (imagesData) => {
  try {
    const response = await apiClient.post('/images/multipleImages', imagesData);
    return response.data;
  } catch (error) {
    throw new Error(`다중 이미지 DB 저장 실패: ${error.message}`);
  }
};

// 전체 이미지 업로드 프로세스 (단건)
export const uploadSingleImage = async (file, filePath = 'board') => {
  try {
    // 1. 파일 확장자 추출
    const extension = file.name.split('.').pop().toLowerCase();
    
    // 2. Presigned URL 요청
    const urlData = await getPresignedUrl(extension, filePath);
    const { presignedUrl, keyName, publicUrl } = urlData;
    
    // 3. S3에 이미지 업로드
    await uploadImageToS3(presignedUrl, file);
    
    // 4. DB에 이미지 정보 저장
    const imageData = {
      keyName,
      imageUrl: publicUrl
    };
    
    const dbResult = await saveImageToDB(imageData);
    
    return {
      keyName,
      imageUrl: publicUrl,
      dbResult: dbResult.result
    };
  } catch (error) {
    throw new Error(`이미지 업로드 프로세스 실패: ${error.message}`);
  }
};

// 전체 이미지 업로드 프로세스 (다중)
export const uploadMultipleImages = async (files, filePath = 'board') => {
  try {
    // 1. 파일 확장자들 추출
    const extensions = files.map(file => file.name.split('.').pop().toLowerCase());
    
    // 2. Presigned URLs 요청
    const urlsData = await getPresignedUrls(extensions, filePath);
    
    // 3. 각 파일을 S3에 업로드
    const uploadPromises = files.map(async (file, index) => {
      const { presignedUrl } = urlsData[index];
      await uploadImageToS3(presignedUrl, file);
      return urlsData[index];
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    
    // 4. DB에 이미지 정보들 저장
    const imagesData = uploadResults.map(result => ({
      keyName: result.keyName,
      imageUrl: result.publicUrl
    }));
    
    const dbResult = await saveMultipleImagesToDB(imagesData);
    
    return uploadResults.map((result, index) => ({
      keyName: result.keyName,
      imageUrl: result.publicUrl,
      dbResult: dbResult.result[index]
    }));
  } catch (error) {
    throw new Error(`다중 이미지 업로드 프로세스 실패: ${error.message}`);
  }
};

// S3에서 파일 존재 여부 확인
export const checkFileExists = async (keyName) => {
  try {
    const response = await apiClient.get('/upload/s3', {
      params: { keyName }
    });
    return response.data;
  } catch (error) {
    throw new Error(`파일 존재 확인 실패: ${error.message}`);
  }
};

// S3에서 파일 삭제
export const deleteFileFromS3 = async (keyName) => {
  try {
    await apiClient.delete(`/upload/s3/${keyName}`);
    return { success: true };
  } catch (error) {
    throw new Error(`S3 파일 삭제 실패: ${error.message}`);
  }
};

// DB에서 이미지 정보 삭제
export const deleteImageFromDB = async (imageId) => {
  try {
    const response = await apiClient.delete(`/images/delete/${imageId}`);
    return response.data;
  } catch (error) {
    throw new Error(`DB 이미지 삭제 실패: ${error.message}`);
  }
};