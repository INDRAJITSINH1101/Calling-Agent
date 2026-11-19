import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  GitPullRequest,
  PhoneCall,
  History,
  Disc,
  GraduationCap,
  PhoneForwarded,
  Megaphone,
  ChevronDown,
  Sparkles,
  Phone,
  Server,
  GitMerge
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface SubNavItem {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  hasDropdown?: boolean;
  badge?: string;
  subItems?: SubNavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const isSipChildActive = ['sip-phone', 'sip-numbers', 'sip-trunks', 'sip-routing'].includes(activeTab);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    'sip-phone': isSipChildActive
  });

  // Automatically close dropdowns when activeTab switches away to a non-child tab
  useEffect(() => {
    if (!isSipChildActive) {
      setOpenDropdowns(prev => ({ ...prev, 'sip-phone': false }));
    }
  }, [isSipChildActive]);

  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdowns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'leads', label: 'Leads & Pipeline', icon: GitPullRequest },
    { id: 'calling-agent', label: 'Calling Agent', icon: PhoneCall },
    { id: 'call-history', label: 'Call History', icon: History },
    { id: 'recordings', label: 'Recordings', icon: Disc },
    { id: 'training', label: 'Training Studio', icon: GraduationCap },
    {
      id: 'sip-phone',
      label: 'SIP & Phone',
      icon: PhoneForwarded,
      hasDropdown: true,
      subItems: [
        { id: 'sip-numbers', label: 'Virtual Phone Numbers', icon: Phone },
        { id: 'sip-trunks', label: 'SIP Trunks & Gateways', icon: Server },
        { id: 'sip-routing', label: 'Inbound Routing Workflow', icon: GitMerge }
      ]
    },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone }
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      backgroundColor: '#0d1322',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '20px 20px 16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)'
        }}>
          <Sparkles size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.04em', color: '#ffffff' }}>
            DEVDUTT AI
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            Unified AI CRM
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDirectActive = activeTab === item.id;
          const isChildActive = !!item.subItems?.some(s => s.id === activeTab);
          const isParentActive = isDirectActive || isChildActive;
          const isDropdownOpen = !!openDropdowns[item.id];
          
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.subItems && item.subItems.length > 0) {
                    const nextState = !isDropdownOpen;
                    setOpenDropdowns(prev => ({ ...prev, [item.id]: nextState }));
                    if (nextState && !isChildActive) {
                      setActiveTab(item.subItems[0].id);
                    }
                  } else {
                    setOpenDropdowns({});
                    setActiveTab(item.id);
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: isDirectActive ? '#1d4ed8' : isChildActive ? 'rgba(37, 99, 235, 0.22)' : 'transparent',
                  color: isParentActive ? '#ffffff' : '#94a3b8',
                  fontWeight: isParentActive ? 600 : 500,
                  fontSize: '13px',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isParentActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isParentActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={17} color={isParentActive ? '#38bdf8' : '#94a3b8'} />
                  <span>{item.label}</span>
                </div>
                {item.hasDropdown && (
                  <div
                    onClick={(e) => toggleDropdown(item.id, e)}
                    style={{
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.7
                    }}
                  >
                    <ChevronDown size={14} style={{
                      transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      color: isParentActive ? '#38bdf8' : '#94a3b8'
                    }} />
                  </div>
                )}
              </button>

              {/* Sub-menu Navigation Links */}
              {item.subItems && isDropdownOpen && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  paddingLeft: '10px',
                  marginTop: '3px',
                  marginBottom: '5px',
                  borderLeft: '1.5px solid rgba(56, 189, 248, 0.25)',
                  marginLeft: '20px'
                }}>
                  {item.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: isSubActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                          outline: 'none',
                          cursor: 'pointer',
                          background: isSubActive
                            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.35) 0%, rgba(56, 189, 248, 0.2) 100%)'
                            : 'transparent',
                          color: isSubActive ? '#ffffff' : '#94a3b8',
                          fontWeight: isSubActive ? 600 : 400,
                          fontSize: '12px',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                          boxShadow: isSubActive ? '0 2px 8px rgba(56, 189, 248, 0.18)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubActive) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = '#e2e8f0';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#94a3b8';
                          }
                        }}
                      >
                        {SubIcon && <SubIcon size={13} color={isSubActive ? '#38bdf8' : '#64748b'} />}
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info / DB Badge */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }}></span>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>System Active</span>
        </div>
        <span style={{ color: '#475569' }}>v1.0.0</span>
      </div>
    </aside>
  );
};
