import React, { useState, useEffect, useCallback } from 'react';
import { ActionTree } from './ActionTree';

interface ActionPageLayoutProps {
  children: React.ReactNode;
  currentActionId?: string;
  colors: {
    bg: string;
    surface: string;
    border: string;
    borderAccent: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    textFaint: string;
  };
}

export const ActionPageLayout: React.FC<ActionPageLayoutProps> = ({
  children,
  currentActionId,
  colors,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        setSidebarOpen(false); // Auto-close on mobile
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  // Restore sidebar state from sessionStorage
  useEffect(() => {
    try {
      const storedOpen = sessionStorage.getItem('actionSidebar.open');
      const storedWidth = sessionStorage.getItem('actionSidebar.width');
      
      if (storedOpen !== null) {
        setSidebarOpen(JSON.parse(storedOpen) && !isMobile);
      }
      if (storedWidth !== null) {
        setSidebarWidth(parseInt(storedWidth, 10));
      }
    } catch (err) {
      console.warn('Failed to restore sidebar state:', err);
    }
  }, [isMobile]);

  // Save sidebar state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('actionSidebar.open', JSON.stringify(sidebarOpen));
    sessionStorage.setItem('actionSidebar.width', sidebarWidth.toString());
  }, [sidebarOpen, sidebarWidth]);

  // Handle sidebar toggle
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Handle resize start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handle tree node click
  const handleNodeClick = useCallback((nodeId: string) => {
    window.location.href = `/${nodeId}`;
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with sidebar toggle */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${colors.border}`,
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <button
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title={sidebarOpen ? 'Hide tree sidebar' : 'Show tree sidebar'}
        >
          <span style={{ fontSize: '10px' }}>
            {sidebarOpen ? '◀' : '▶'}
          </span>
          Tree
        </button>
        
        <div style={{
          fontSize: '13px',
          color: colors.textSubtle,
          fontWeight: '500',
        }}>
          ActionBias
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <div style={{
              width: isMobile ? '100%' : `${sidebarWidth}px`,
              backgroundColor: '#ffffff',
              borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              position: isMobile ? 'fixed' : 'relative',
              top: isMobile ? 0 : 'auto',
              left: isMobile ? 0 : 'auto',
              height: isMobile ? '100vh' : 'auto',
              zIndex: isMobile ? 50 : 'auto',
              boxShadow: isMobile ? '2px 0 8px rgba(0,0,0,0.1)' : 'none',
            }}>
              {/* Mobile header */}
              {isMobile && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    Action Tree
                  </span>
                  <button
                    onClick={toggleSidebar}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: colors.textMuted,
                      padding: '4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* Tree content */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '0.5rem',
              }}>
                <ActionTree
                  currentActionId={currentActionId}
                  onNodeClick={handleNodeClick}
                  includeCompleted={false}
                />
              </div>
            </div>

            {/* Resize handle (desktop only) */}
            {!isMobile && (
              <div
                style={{
                  width: '4px',
                  cursor: 'ew-resize',
                  backgroundColor: isResizing ? colors.borderAccent : 'transparent',
                  transition: 'background-color 0.15s ease',
                  position: 'relative',
                }}
                onMouseDown={handleMouseDown}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '-2px',
                  right: '-2px',
                  cursor: 'ew-resize',
                }} />
              </div>
            )}

            {/* Mobile overlay */}
            {isMobile && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  zIndex: 45,
                }}
                onClick={toggleSidebar}
              />
            )}
          </>
        )}

        {/* Main content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Content area - scrollable */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '2rem 1rem 1rem 1rem',
          }}>
            <div style={{
              maxWidth: '48rem',
              margin: '0 auto',
            }}>
              {children}
            </div>
          </div>
          
          {/* Persistent Footer */}
          <footer style={{
            backgroundColor: '#ffffff',
            borderTop: `1px solid ${colors.border}`,
            padding: '1.5rem 1rem',
            marginTop: 'auto'
          }}>
            <div style={{
              maxWidth: '48rem',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <div style={{
                marginBottom: '1rem'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: colors.text,
                  margin: '0 0 0.5rem 0'
                }}>
                  ActionBias
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: colors.textMuted,
                  margin: '0 0 0.75rem 0',
                  lineHeight: '1.5'
                }}>
                  Cross-LLM persistent planning system for focused action taking
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  color: colors.textSubtle,
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  Stay focused on what matters most. Break down complex projects into actionable steps with context-aware prioritization.
                </p>
              </div>
              
              {/* Future: User info section will go here when multi-tenancy is implemented */}
              <div style={{
                fontSize: '0.75rem',
                color: colors.textFaint,
                borderTop: `1px solid ${colors.border}`,
                paddingTop: '0.75rem'
              }}>
                Single-user instance • <a href="https://github.com/exhibit-org/actionbias" style={{ color: colors.textSubtle, textDecoration: 'none' }}>Open Source</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};