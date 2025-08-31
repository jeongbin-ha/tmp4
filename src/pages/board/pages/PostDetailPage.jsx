import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, SideMenuWrapper } from '../styles/commonStyles';
import {
  ContentArea, PostDetailContainer, PostHeader, PostTitle,
  PostContent, PostMeta, PostAuthor, PostDate,
  PostActions, LikeButton, LikeIcon, ImageContainer,
  PostImage, ImagePagination, PaginationDot, CommentsSection,
  CommentsSectionTitle, CommentItem, CommentHeader, CommentAuthor,
  CommentDate, CommentContent, CommentButton, CommentIcon,
  CommentLikeInfo, ReplyIndicator, CommentInput, CommentInputContainer,
  CommentSubmitButton, CommentHeaderActions, CommentActionButton,
  Divider,
} from '../styles/postDetailStyles';
import HomeIconMenu from '../../../components/HomeIconMenu';
import Header from '../components/BoardHeader';
import ActionSheet from '../components/ActionSheet';
import Modal from '../components/Modal';
import useModal from '../hooks/useModal';
import usePosts from '../hooks/usePosts';
import LikePink from '../components/Icons/LikePink.svg';
import Like from '../components/Icons/Like.svg';
import Comment from '../components/Icons/Comment.svg';
import Edit from '../components/Icons/Edit.svg';
import Delete from '../components/Icons/Delete.svg';
import Tab from '../components/Icons/Tab.svg';
import Lock from '../components/Icons/Lock.svg';
import useResponsive from '../hooks/useResponsive';

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    getPost, 
    getComments, 
    addComment, 
    updateComment, 
    deleteComment, 
    deletePost,
    togglePostLike,
    toggleCommentLike 
  } = usePosts();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const { isOpen: isActionSheetOpen, openModal: openActionSheet, closeModal: closeActionSheet } = useModal();
  const { isOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();
  const [selectedComment, setSelectedComment] = useState(null);

  const currentUserId = 'currentUser'; // 실제로는 로그인한 사용자 ID
  const isPC = useResponsive();
  
  // 게시글 및 댓글 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingPost(true);
        setLoadingComments(true);

        // 게시글 상세 조회
        const foundPost = await getPost(id);
        if (foundPost) {
          setPost({ ...foundPost, isLiked: false }); // 좋아요 상태는 별도 API로 확인 필요
        } else {
          navigate('/board');
          return;
        }

        // 댓글 목록 조회
        const foundComments = await getComments(id);
        setComments(foundComments.map(comment => ({ 
          ...comment, 
          isLiked: false // 댓글 좋아요 상태도 별도 확인 필요
        })));

      } catch (error) {
        console.error('데이터 로드 실패:', error);
        navigate('/board');
      } finally {
        setLoadingPost(false);
        setLoadingComments(false);
      }
    };

    loadData();
  }, [id, getPost, getComments, navigate]);

  // 댓글 추가 시 트리 구조 유지
  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    // 깊이 제한 적용 (최대 4단계)
    const newReplyLevel = replyingTo ? Math.min(replyingTo.replyLevel + 1, 4) : 0;
    
    // 깊이 제한 초과 시 경고
    if (replyingTo && replyingTo.replyLevel >= 4) {
      alert('대댓글은 최대 4단계까지만 작성할 수 있습니다.');
      return;
    }

    try {
      const commentData = {
        content: commentText,
        parentId: replyingTo ? replyingTo.id : null,
        replyLevel: newReplyLevel
      };

      const newComment = await addComment(id, commentData);
      
      // 댓글 목록 새로고침
      const updatedComments = await getComments(id);
      setComments(updatedComments.map(comment => ({ 
        ...comment, 
        isLiked: false 
      })));
      
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  // 게시글 좋아요 토글
  const handlePostLike = async () => {
    try {
      await togglePostLike(id);
      
      // 좋아요 상태 업데이트
      setPost(prev => ({
        ...prev,
        isLiked: !prev.isLiked,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
      }));
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  // 댓글 좋아요 토글
  const handleCommentLike = async (commentId) => {
    try {
      const result = await toggleCommentLike(commentId);
      
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: result.liked,
            likes: comment.likes + result.likeChange
          };
        }
        return comment;
      }));
    } catch (error) {
      console.error('댓글 좋아요 실패:', error);
      alert('댓글 좋아요 처리에 실패했습니다.');
    }
  };

  // 댓글 삭제 - 대댓글 유무에 따른 처리 분기
  const handleCommentDelete = async (commentId) => {
    try {
      // 삭제할 댓글의 대댓글 존재 여부 확인
      const hasReplies = comments.some(comment => comment.parentId === commentId);
      
      await deleteComment(id, commentId);
      
      if (hasReplies) {
        // 대댓글이 있는 경우: 삭제 표시만 하고 댓글 유지
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isDeleted: true,
              content: '삭제된 댓글입니다.',
              author: ''
            };
          }
          return comment;
        }));
      } else {
        // 대댓글이 없는 경우: UI에서 완전 제거
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }
      
      closeDeleteModal();
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 게시글 삭제
  const handlePostDelete = async () => {
    try {
      await deletePost(id);
      navigate('/board');
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  // 대댓글 시작
  const handleReply = (comment) => {
    setReplyingTo(comment);
  };

  if (loadingPost) {
    return (
      <Container>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          게시글을 불러오는 중...
        </div>
      </Container>
    );
  }

  if (!post) return null;
  
  const isMyPost = post.userId === currentUserId;

  // 게시글 옵션 액션시트
  const postActions = [
    {
      icon: <img src={Edit} alt="수정" width="20" height="20" />,
      label: '수정하기',
      type: 'edit',
      onClick: () => navigate(`/board/edit/${id}`)
    },
    {
      icon: <img src={Delete} alt="삭제" width="20" height="20" />,
      label: '삭제하기',
      type: 'delete',
      onClick: () => {
        closeActionSheet();
        setSelectedComment(null);
        openDeleteModal();
      }
    }
  ];

  // 모달 액션
  const deleteModalActions = [
    {
      label: '취소',
      type: 'cancel',
      onClick: closeDeleteModal
    },
    {
      label: '삭제',
      type: 'confirm',
      onClick: () => {
        if (selectedComment) {
          handleCommentDelete(selectedComment.id);
        } else {
          handlePostDelete();
        }
      }
    }
  ];

  return (
    <Container>
      {!isPC && (
        <Header
          title={post.category}
          showBack={true}
          myPost={isMyPost ? openActionSheet : undefined}
        />
      )}

      <SideMenuWrapper>
        <HomeIconMenu isWeb={true} />
      </SideMenuWrapper>

      <ContentArea>
        <PostDetailContainer>
          {/* 게시글 헤더 */}
          <PostHeader>
            {isPC && ( 
              <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                <PostTitle>{post.title}</PostTitle>
                <div style={{marginBottom: '12px', fontSize: '16px', fontWeight: 'bold', color: '#F67676'}}>
                  {post.category === 'general' ? '일반' : '홍보' }
                </div>
              </div>
            )}
            <PostMeta>
              <PostAuthor>{post.author}</PostAuthor>
              <PostDate>{post.date}</PostDate>
            </PostMeta>
            {!isPC && ( <PostTitle>{post.title}</PostTitle> )}
          </PostHeader>

          {/* 게시글 내용 */}
          <PostContent>{post.content}</PostContent>

          {/* 게시글 이미지 */}
          {post.image && post.image.length > 0 && (
            <ImageContainer>
              <PostImage 
                src={Array.isArray(post.image) ? post.image[currentImageIndex] : post.image} 
                alt="게시글 이미지" 
              />
              {Array.isArray(post.image) && post.image.length > 1 && !isPC && (
                <ImagePagination>
                  {post.image.map((_, index) => (
                    <PaginationDot
                      key={index}
                      active={index === currentImageIndex}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </ImagePagination>
              )}
            </ImageContainer>
          )}

          {/* 게시글 좋아요 */}
          {!isPC && (
          <PostActions>
            <LikeButton liked={post.isLiked} onClick={handlePostLike}>
              <LikeIcon src={LikePink} alt="좋아요" />
              좋아요
            </LikeButton>
          </PostActions>
          )}

          <Divider />

          {/* 댓글 섹션 */}
          <CommentsSection>
            <CommentsSectionTitle>
              댓글 {loadingComments ? '...' : comments.length}개
            </CommentsSectionTitle>

            {/* PC 댓글 입력 */}
            {isPC && (
              <CommentInputContainer>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}> 
                  <div style={{ 
                    display: 'flex', flexDirection: 'column', height: '67%', 
                    padding: '20px 16px 8px 16px', gap: '10px', borderBottom: '1px solid #DDDDDD'
                  }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '500', padding: '4px 0px' }}>익명</div>
                      {replyingTo && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#999', 
                          padding: '6px 8px',
                          background: '#f5f5f5',
                          borderRadius: '4px'
                        }}>
                          {replyingTo.author}님에게 답글 작성 중
                          <button 
                            onClick={() => setReplyingTo(null)}
                            style={{ 
                              marginLeft: '8px', 
                              background: 'none', 
                              border: 'none', 
                              color: '#999',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <CommentInput
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit();
                        }
                      }}
                    />
                  </div>
                  <div style={{ 
                    display: 'flex', flexDirection: 'row', height: '33%', justifyContent: 'space-between', 
                    padding: '16px 20px', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <img src={Lock} alt="lock" width="24" height="24" />
                      <div style={{ fontSize: '16px', fontWeight: '500', color: '#929292' }}>익명</div>
                    </div>
                    <CommentSubmitButton onClick={handleCommentSubmit}>
                      등록
                    </CommentSubmitButton>
                  </div>
                </div>
              </CommentInputContainer>
            )}
            
            {/* 댓글 로딩 상태 */}
            {loadingComments ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                댓글을 불러오는 중...
              </div>
            ) : (
              // 개별 댓글
              comments.map((comment) => (
                <CommentItem key={comment.id} replyLevel={comment.replyLevel}>
                  {comment.replyLevel > 0 && (
                    <ReplyIndicator>
                      {Array.from({ length: comment.replyLevel - 1 }).map((_, index) => (
                        <React.Fragment key={index}>
                          {!isPC && ( <div style={{ width: '20px', height: '20px' }} /> )}
                          {isPC && ( <div style={{ width: '24px', height: '24px' }} /> )}
                        </React.Fragment>
                      ))}
                      {/* 마지막 단계만 Tab 아이콘 */}
                      {!isPC && ( <img src={Tab} alt="대댓글" width="20" height="20" /> )}
                      {isPC && ( <img src={Tab} alt="대댓글" width="24" height="24" /> )}
                    </ReplyIndicator>
                  )}
                  <div >
                    {/* 삭제된 댓글 표시 처리 */}
                    {comment.isDeleted ? (
                      // 삭제된 댓글 표시
                      <div style={{
                        padding: '12px 0',
                        color: '#999',
                        fontStyle: 'italic',
                        fontSize: '13px'
                      }}>
                        삭제된 댓글입니다.
                      </div>
                    ) : (
                      <>
                        <CommentHeader>
                          <div>
                            <CommentAuthor>
                              {comment.author}
                            </CommentAuthor>
                            <CommentDate>{comment.date}</CommentDate>
                          </div>
                          
                          <CommentHeaderActions>
                            {comment.userId !== currentUserId && (
                              <CommentButton onClick={() => handleCommentLike(comment.id)}>
                                <CommentIcon 
                                  src={comment.isLiked ? LikePink : Like} 
                                  alt="좋아요" 
                                />
                              </CommentButton>
                            )}
                            
                            {/* 깊이 제한 - 4단계 미만일 때만 대댓글 버튼 표시 */}
                            {comment.replyLevel < 4 && (
                              <CommentButton onClick={() => handleReply(comment)}>
                                <CommentIcon src={Comment} alt="대댓글" />
                              </CommentButton>
                            )}

                            {comment.userId === currentUserId && (
                              <>
                                <CommentActionButton onClick={() => console.log('댓글 수정 기능 구현 예정')}>
                                  수정
                                </CommentActionButton>
                                <CommentActionButton 
                                  onClick={() => {
                                    setSelectedComment(comment);
                                    openDeleteModal();
                                  }}
                                  className="delete"
                                >
                                  삭제
                                </CommentActionButton>
                              </>
                            )}
                          </CommentHeaderActions>
                        </CommentHeader>
                        
                        <CommentContent>{comment.content}</CommentContent>
                        
                        {comment.likes > 0 && (
                          <CommentLikeInfo>
                            <img src={isPC ? Like : LikePink } alt="좋아요" width={isPC ? '28px' : '20px' } height={isPC ? '28px' : '20px' } />
                            <span>{comment.likes}</span>
                          </CommentLikeInfo>
                        )}
                      </>
                    )}
                  </div>
                </CommentItem>
              ))
            )}
          </CommentsSection>
        </PostDetailContainer>
      </ContentArea>

      {/* 모바일 댓글 입력 */}
      {!isPC && (
      <CommentInputContainer>
        {replyingTo && (
          <div style={{ 
            fontSize: '12px', 
            color: '#999', 
            marginBottom: '8px',
            padding: '4px 8px',
            background: '#f5f5f5',
            borderRadius: '4px'
          }}>
            {replyingTo.author}님에게 답글 작성 중
            <button 
              onClick={() => setReplyingTo(null)}
              style={{ 
                marginLeft: '8px', 
                background: 'none', 
                border: 'none', 
                color: '#999',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <CommentInput
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
          />
          <CommentSubmitButton onClick={handleCommentSubmit}>
            등록
          </CommentSubmitButton>
        </div>
      </CommentInputContainer>
      )}

      {/* 액션시트 */}
      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={closeActionSheet}
        title="게시글"
        actions={postActions} 
      />

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title={selectedComment ? "댓글을 삭제하시겠어요?" : "게시글을 삭제하시겠어요?"}
        actions={deleteModalActions}
      />
    </Container>
  );
};

export default PostDetailPage;