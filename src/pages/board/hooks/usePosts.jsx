
import { useState, useEffect, useCallback } from 'react';
import useResponsive from './useResponsive';
import * as boardApi from '../api/boardApi.js';
import * as imageApi from '../api/imageApi.js';

const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userType] = useState('registerUser'); // 'normalUser' | 'registerUser'   - 임시
  const isPC = useResponsive();

  // API 응답 데이터 변환
  const transformBoardData = useCallback((apiBoard) => {
    return {
      id: apiBoard.boardId,
      title: apiBoard.title,
      content: apiBoard.content,
      author: apiBoard.writer,
      date: new Date(apiBoard.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\. /g, '.').replace('.', ''),
      likes: apiBoard.likeCount,
      comments: apiBoard.commentCount,
      category: apiBoard.boardType.toLowerCase() === 'normal' ? 'general' : 'promotion',
      isHot: apiBoard.likeCount >= 10,
      image: apiBoard.imgUrls || [],
      userId: apiBoard.memberId,
      createdAt: apiBoard.createdAt,
      updatedAt: apiBoard.updatedAt
    };
  }, []);

  // 댓글 데이터 변환
  const transformCommentData = useCallback((apiComment, depth = 0) => {
    const transformed = {
      id: apiComment.commentId,
      author: apiComment.writer,
      content: apiComment.deleted ? '삭제된 댓글입니다.' : apiComment.content,
      date: new Date(apiComment.createdAt || Date.now()).toLocaleDateString('ko-KR', { 
        month: '2-digit', 
        day: '2-digit' 
      }),
      userId: apiComment.memberId || 'unknown',
      replyLevel: depth,
      parentId: apiComment.parentId,
      likes: apiComment.likeCount || 0,
      isLiked: false, // API에서 사용자별 좋아요 상태 확인 필요
      isDeleted: apiComment.deleted || false,
      children: []
    };

    // 대댓글이 있는 경우 재귀적으로 변환
    if (apiComment.children && apiComment.children.length > 0) {
      transformed.children = apiComment.children.map(child => 
        transformCommentData(child, depth + 1)
      );
    }

    return transformed;
  }, []);

  // 댓글을 평면 배열로 변환 (트리 구조 유지)
  const flattenComments = useCallback((comments) => {
    const result = [];
    
    const flatten = (commentList, level = 0) => {
      commentList.forEach(comment => {
        result.push({ ...comment, replyLevel: level });
        if (comment.children && comment.children.length > 0) {
          flatten(comment.children, level + 1);
        }
      });
    };
    
    flatten(comments);
    return result;
  }, []);

  // 글작성 권한확인
 const canCreatePost = useCallback((category) => {
    if (category === 'promotion') {
      return userType === 'registerUser';
    }
    return true; // 일반탭, Hot탭은 모든 유저 가능
  }, [userType]);

  // 게시글 목록 로드
  const loadPosts = useCallback(async (category = 'general', pageNum = 0, reset = false) => {
    setLoading(true);
    
    try {
      let response;
      const pageSize = isPC ? 6 : 20; 
      
      if (category === 'hot') {
        // 핫게시판 조회
        response = await boardApi.getHotBoards();
        const hotPosts = response.map(transformBoardData);
        
        if (reset) {
          setPosts(hotPosts);
        } else {
          setPosts(prev => [...prev, ...hotPosts]);
        }
        setHasMore(false); // 핫게시판은 고정 목록
      } else {
        // 일반/홍보 게시판 조회
        response = await boardApi.getBoardList(category, pageNum, pageSize);
        const newPosts = response.content.map(transformBoardData);
        
        if (reset) {
          setPosts(newPosts);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
        }
        
        setHasMore(!response.last);
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [isPC, transformBoardData]);

  // 더보기 (추가로드)
  const loadMore = useCallback((category) => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(category, nextPage, false);
    }
  }, [loading, hasMore, page, loadPosts]);

  // 게시글 상세 조회
  const getPost = useCallback(async (id) => {
    try {
      const response = await boardApi.getBoardDetail(id);
      return transformBoardData(response);
    } catch (error) {
      console.error('게시글 상세 조회 실패:', error);
      return null;
    }
  }, [transformBoardData]);

  // 댓글 목록 조회
  const getComments = useCallback(async (postId) => {
    try {
      const response = await boardApi.getComments(postId);
      // API가 트리 구조로 반환하므로 평면 배열로 변환
      const transformedComments = response.map(comment => transformCommentData(comment));
      return flattenComments(transformedComments);
    } catch (error) {
      console.error('댓글 조회 실패:', error);
      return [];
    }
  }, [transformCommentData, flattenComments]);

  // 게시글 작성
  const addPost = useCallback(async (postData) => {
    try {
      // 이미지 업로드 처리
      let imageRequestDTOs = [];
      
      if (postData.images && postData.images.length > 0) {
        const files = postData.images.map(img => img.file);
        const uploadResults = await imageApi.uploadMultipleImages(files, 'board');
        
        imageRequestDTOs = uploadResults.map(result => ({
          keyName: result.keyName,
          imageUrl: result.imageUrl
        }));
      }

      // 게시글 데이터 준비
      const boardData = {
        title: postData.title,
        content: postData.content,
        boardType: boardApi.BOARD_TYPE[postData.category] || 'NORMAL',
        imageRequestDTOs
      };

      const response = await boardApi.createBoard(boardData);
      return transformBoardData(response);
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      throw error;
    }
  }, [transformBoardData]);

  // 게시글 수정
  const updatePost = useCallback(async (postId, updates) => {
    try {
      const boardData = {
        title: updates.title,
        content: updates.content,
        boardType: boardApi.BOARD_TYPE[updates.category] || 'NORMAL',
        imageRequestDTOs: updates.imageRequestDTOs || []
      };
      
      const response = await boardApi.updateBoard(postId, boardData);
      return transformBoardData(response);
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      throw error;
    }
  }, [transformBoardData]);

  // 게시글 삭제
  const deletePost = useCallback(async (postId) => {
    try {
      await boardApi.deleteBoard(postId);
      return { success: true };
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      throw error;
    }
  }, []);

  // 게시글 좋아요 토글
  const togglePostLike = useCallback(async (postId) => {
    try {
      await boardApi.toggleBoardLike(postId);
      return { success: true };
    } catch (error) {
      console.error('게시글 좋아요 실패:', error);
      throw error;
    }
  }, []);

  // 댓글 추가
  const addComment = useCallback(async (postId, commentData) => {
    try {
      const response = await boardApi.createComment(postId, {
        content: commentData.content,
        parentCommentId: commentData.parentId || null
      });
      
      return {
        id: response.commentId,
        author: response.writer,
        content: response.content,
        date: new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
        userId: 'currentUser',
        replyLevel: commentData.replyLevel || 0,
        parentId: response.parentId,
        likes: 0,
        isLiked: false
      };
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      throw error;
    }
  }, []);

  // 댓글 수정
  const updateComment = useCallback(async (postId, commentId, updates) => {
    try {
      const response = await boardApi.updateComment(commentId, updates.content);
      return {
        id: response.commentId,
        content: response.content,
        writer: response.writer
      };
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      throw error;
    }
  }, []);

  // 댓글 삭제
  const deleteComment = useCallback(async (postId, commentId) => {
    try {
      await boardApi.deleteComment(commentId);
      return { success: true };
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      throw error;
    }
  }, []);

  // 댓글 좋아요 토글
  const toggleCommentLike = useCallback(async (commentId) => {
    try {
      const result = await boardApi.toggleCommentLike(commentId);
      return { 
        success: true, 
        liked: result === 1, // 1: 좋아요, -1: 취소
        likeChange: result 
      };
    } catch (error) {
      console.error('댓글 좋아요 실패:', error);
      throw error;
    }
  }, []);

  // 검색 함수
  const searchPosts = useCallback(async (keyword, category = 'general', page = 0, size = 20) => {
    try {
      setLoading(true);
      const searchSize = size || (isPC ? 6 : 20);
      const response = await boardApi.searchBoards(keyword, category, page, searchSize);
      const searchResults = response.content.map(transformBoardData);
      
      setPosts(searchResults);
      setHasMore(!response.last);
      return searchResults;
    } catch (error) {
      console.error('게시글 검색 실패:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isPC, transformBoardData]);

  return {
    // 상태값들
    posts,
    loading,
    hasMore,
    userType,
    
    // 기본 게시글 함수들
    canCreatePost,
    loadPosts,
    loadMore,
    setPage,
    getPost,
    addPost,
    updatePost,
    deletePost,
    togglePostLike,
    searchPosts,
    
    // 댓글 관련 함수들
    getComments,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike
  };
};

export default usePosts;