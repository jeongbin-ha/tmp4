
import apiClient from './apiService.js';

// 게시판 타입 매핑
export const BOARD_TYPE = {
  general: 'NORMAL',
  promotion: 'PROMOTION'
};

// 게시글 목록 조회 (무한스크롤)
export const getBoardList = async (boardType, page = 0, size = 20) => {
  try {
    const mappedType = BOARD_TYPE[boardType] || 'NORMAL';
    const response = await apiClient.get('/boards', {
      params: {
        boardType: mappedType,
        page,
        size
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`게시글 목록 조회 실패: ${error.message}`);
  }
};

// 핫게시판 조회
export const getHotBoards = async () => {
  try {
    const response = await apiClient.get('/boards/hot');
    return response.data;
  } catch (error) {
    throw new Error(`핫게시판 조회 실패: ${error.message}`);
  }
};

// 게시글 검색
export const searchBoards = async (keyword, boardType, page = 0, size = 20) => {
  try {
    const mappedType = BOARD_TYPE[boardType] || 'NORMAL';
    const response = await apiClient.get('/boards/search', {
      params: {
        keyword,
        boardType: mappedType,
        page,
        size
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`게시글 검색 실패: ${error.message}`);
  }
};

// 게시글 상세 조회
export const getBoardDetail = async (boardId) => {
  try {
    const response = await apiClient.get(`/boards/${boardId}`);
    return response.data;
  } catch (error) {
    throw new Error(`게시글 상세 조회 실패: ${error.message}`);
  }
};

// 게시글 작성
export const createBoard = async (boardData) => {
  try {
    const response = await apiClient.post('/boards', boardData);
    return response.data;
  } catch (error) {
    throw new Error(`게시글 작성 실패: ${error.message}`);
  }
};

// 게시글 수정
export const updateBoard = async (boardId, boardData) => {
  try {
    const response = await apiClient.put(`/boards/${boardId}`, boardData);
    return response.data;
  } catch (error) {
    throw new Error(`게시글 수정 실패: ${error.message}`);
  }
};

// 게시글 삭제
export const deleteBoard = async (boardId) => {
  try {
    await apiClient.delete(`/boards/${boardId}`);
    return { success: true };
  } catch (error) {
    throw new Error(`게시글 삭제 실패: ${error.message}`);
  }
};

// 게시글 좋아요 토글
export const toggleBoardLike = async (boardId) => {
  try {
    const response = await apiClient.post(`/boards/${boardId}/like`);
    return response.data;
  } catch (error) {
    throw new Error(`좋아요 처리 실패: ${error.message}`);
  }
};

// 댓글 목록 조회
export const getComments = async (boardId) => {
  try {
    const response = await apiClient.get(`/boards/${boardId}/comments`);
    return response.data;
  } catch (error) {
    throw new Error(`댓글 조회 실패: ${error.message}`);
  }
};

// 댓글 작성
export const createComment = async (boardId, commentData) => {
  try {
    const response = await apiClient.post(`/boards/${boardId}/comments`, commentData);
    return response.data;
  } catch (error) {
    throw new Error(`댓글 작성 실패: ${error.message}`);
  }
};

// 댓글 수정
export const updateComment = async (commentId, content) => {
  try {
    const response = await apiClient.patch(`/boards/comments/${commentId}`, content, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`댓글 수정 실패: ${error.message}`);
  }
};

// 댓글 삭제
export const deleteComment = async (commentId) => {
  try {
    await apiClient.delete(`/boards/comments/${commentId}`);
    return { success: true };
  } catch (error) {
    throw new Error(`댓글 삭제 실패: ${error.message}`);
  }
};

// 댓글 좋아요 토글
export const toggleCommentLike = async (commentId) => {
  try {
    const response = await apiClient.post(`/boards/comments/${commentId}/like`);
    return response.data;
  } catch (error) {
    throw new Error(`댓글 좋아요 처리 실패: ${error.message}`);
  }
};