import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Disc,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  X
} from 'lucide-react';
import { callsApi } from '../services/callsApi';
import { CallLog } from '../types/calls';
import { Badge } from '../components/ui/Badge';
import {
  TableContainer,
  Table,
  TableHead,
  TableHeaderRow,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell
} from '../components/ui/Table';
import { FilterBar } from '../components/ui/FilterBar';
import { TableActionButtons } from '../components/ui/ActionButtons';
import { Pagination } from '../components/common/Pagination';

export const RecordingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('');

  // Audio Playback State (Inline Table Player)
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Scrubber Hover Tooltip State
  const [hoveredCallId, setHoveredCallId] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch calls with recordings
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recordingsLibrary', page, pageSize, searchTerm, sentimentFilter],
    queryFn: () => callsApi.getCallHistory({
      page,
      pageSize,
      search: searchTerm.trim() || undefined,
      sentiment: sentimentFilter || undefined,
      hasRecording: true
    }),
    staleTime: 1000 * 30
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => callsApi.deleteCallLog(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['recordingsLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['callHistory'] });
      if (activePlayingId === deletedId) {
        if (audioRef.current) audioRef.current.pause();
        setActivePlayingId(null);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  });

  const recordingItems = data?.items || [];
  const totalRecordings = data?.total || 0;

  // Toggle Play / Pause without removing the active player on pause
  const handleTogglePlay = (call: CallLog) => {
    if (!call.recording_url) return;

    if (activePlayingId === call.id) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
          // Keep activePlayingId intact so the player remains in paused state!
        } else {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.warn('Resume audio failed:', e));
        }
      }
    } else {
      setActivePlayingId(call.id);
      setIsPlaying(true);
      setCurrentTime(0);
      const initialDur = (call.duration_seconds && call.duration_seconds > 0) ? call.duration_seconds : 0;
      setDuration(initialDur);

      if (audioRef.current) {
        audioRef.current.src = `http://localhost:8000${call.recording_url}`;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.muted = isMuted;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.warn('Play audio failed:', e));
      }
    }
  };

  const handleClosePlayer = (callId: number) => {
    if (activePlayingId === callId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActivePlayingId(null);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackSpeed(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  // Direct timestamp seek (click/scrub forward & rewind)
  const handleTrackSeek = (e: React.MouseEvent<HTMLDivElement>, callTotalDuration: number) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    const targetTime = ratio * callTotalDuration;
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Mouse hover time indicator
  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>, callTotalDuration: number, callId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    const targetTime = ratio * callTotalDuration;
    setHoveredCallId(callId);
    setHoverTime(targetTime);
    setHoverX(clickX);
  };

  const handleTrackMouseLeave = () => {
    setHoveredCallId(null);
    setHoverTime(null);
    setHoverX(null);
  };

  // Bulletproof time formatter: guarantees no Infinity:NaN
  const formatSecs = (sec: number | undefined | null) => {
    if (sec === undefined || sec === null || !isFinite(sec) || isNaN(sec) || sec < 0) {
      return '00:00';
    }
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Central Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            const d = audioRef.current.duration;
            if (isFinite(d) && !isNaN(d) && d > 0) {
              setDuration(d);
            }
          }
        }}
        onLoadedMetadata={() => {
          const audioEl = audioRef.current;
          if (audioEl) {
            const d = audioEl.duration;
            if (isFinite(d) && !isNaN(d) && d > 0) {
              setDuration(d);
            } else if (audioEl.duration === Infinity) {
              // Chromium WebM duration workaround
              audioEl.currentTime = 1e101;
              audioEl.ontimeupdate = () => {
                audioEl.ontimeupdate = () => {
                  if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                };
                if (isFinite(audioEl.duration) && audioEl.duration > 0) {
                  setDuration(audioEl.duration);
                }
                audioEl.currentTime = 0;
              };
            }
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Top Header without floating card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Disc size={22} color="#a855f7" className={isPlaying ? 'animate-spin' : ''} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
              Audio Recordings Studio & QA Vault
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Listen to recorded voice agent calls, inspect speech flow, evaluate AI responses, and audit compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: '#f8fafc',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          <span>Refresh Studio</span>
        </button>
      </div>

      {/* Reusable FilterBar Component */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        searchPlaceholder="Search recordings by contact, phone or summary..."
        filters={[
          {
            key: 'sentiment',
            value: sentimentFilter,
            onChange: (val) => {
              setSentimentFilter(val);
              setPage(1);
            },
            options: [
              { value: '', label: 'All QA Sentiments' },
              { value: 'POSITIVE', label: 'Positive Experience' },
              { value: 'NEUTRAL', label: 'Neutral Dialogue' },
              { value: 'NEGATIVE', label: 'Critical / Objection' }
            ]
          }
        ]}
      />

      {/* Reusable Table for Audio Recordings with Action Buttons */}
      <TableContainer>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading audio recordings studio...
          </div>
        ) : recordingItems.length === 0 ? (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <Disc size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>No audio recordings saved yet</div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Start an AI Voice Call from the Calling Agent to capture and review recordings here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderRow>
                <TableHeadCell style={{ width: '45px' }}>ID</TableHeadCell>
                <TableHeadCell style={{ minWidth: '110px' }}>Name</TableHeadCell>
                <TableHeadCell style={{ minWidth: '130px' }}>Contact</TableHeadCell>
                <TableHeadCell style={{ minWidth: '420px' }}>Audio Player & Duration</TableHeadCell>
                <TableHeadCell style={{ minWidth: '100px' }}>Sentiment</TableHeadCell>
                <TableHeadCell style={{ minWidth: '100px' }}>Recorded At</TableHeadCell>
                <TableHeadCell style={{ minWidth: '120px' }}>Actions</TableHeadCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {recordingItems.map((call, index) => {
                const isThisActive = activePlayingId === call.id;
                const isThisPlaying = isThisActive && isPlaying;

                // Accurate duration: prioritize finite audio.duration, else stored call.duration_seconds
                const callTotalDuration = (isThisActive && isFinite(duration) && duration > 0)
                  ? duration
                  : ((call.duration_seconds && call.duration_seconds > 0) ? call.duration_seconds : 1);

                // Exact progress percentage (0 to 100%)
                const progressPercent = isThisActive
                  ? Math.min(100, Math.max(0, (currentTime / callTotalDuration) * 100))
                  : 0;

                return (
                  <TableRow
                    key={call.id}
                    style={{
                      background: isThisActive ? 'rgba(168, 85, 247, 0.08)' : undefined
                    }}
                  >
                    {/* Dynamic Sequential ID */}
                    <TableCell style={{ color: '#94a3b8', fontWeight: 600 }}>
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>

                    {/* Name */}
                    <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {call.contact_name || 'Prospect'}
                    </TableCell>

                    {/* Contact (Phone & Company) */}
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                          {call.contact_phone || 'Direct'}
                        </span>
                        {call.company_name && (
                          <span style={{ color: '#64748b', fontSize: '11px' }}>
                            {call.company_name}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Audio Player & Duration Column */}
                    <TableCell>
                      {!isThisActive ? (
                        /* Idle State: Compact preview pill */
                        <div
                          onClick={() => handleTogglePlay(call)}
                          title="Click to play recording"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                          }}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(168, 85, 247, 0.3)',
                              border: 'none',
                              color: '#c084fc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <Play size={13} style={{ marginLeft: '1px' }} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '16px', width: '80px' }}>
                            {[10, 16, 6, 20, 12, 22, 8, 18, 12, 20, 14, 8, 18, 12, 20].map((h, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: `${h * 0.45}px`,
                                  background: 'rgba(255, 255, 255, 0.25)',
                                  borderRadius: '1px'
                                }}
                              />
                            ))}
                          </div>

                          <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 600 }}>
                            {formatSecs(call.duration_seconds)}
                          </span>
                        </div>
                      ) : (
                        /* Active State: Full Inline Audio Player with Seekbar, Speed & Volume */
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'linear-gradient(135deg, rgba(24, 24, 37, 0.95), rgba(15, 23, 42, 0.98))',
                            border: '1px solid rgba(168, 85, 247, 0.5)',
                            borderRadius: '12px',
                            padding: '8px 14px',
                            boxShadow: '0 4px 18px -2px rgba(168, 85, 247, 0.3)',
                            minWidth: '400px',
                            maxWidth: '520px',
                            position: 'relative'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Play / Pause Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePlay(call)}
                            title={isThisPlaying ? 'Pause recording' : 'Resume recording'}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                              border: 'none',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(168, 85, 247, 0.5)'
                            }}
                          >
                            {isThisPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '1px' }} />}
                          </button>

                          {/* Scrubber Track & Hover Timestamp Tooltip */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', position: 'relative' }}>
                            {/* Hover Timestamp Tooltip */}
                            {hoveredCallId === call.id && hoverX !== null && hoverTime !== null && (
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 'calc(100% + 6px)',
                                  left: `${hoverX}px`,
                                  transform: 'translateX(-50%)',
                                  backgroundColor: '#9333ea',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  pointerEvents: 'none',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                  zIndex: 50
                                }}
                              >
                                {formatSecs(hoverTime)}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '4px solid transparent',
                                    borderRight: '4px solid transparent',
                                    borderTop: '4px solid #9333ea'
                                  }}
                                />
                              </div>
                            )}

                            {/* Direct Timestamp Seek Track */}
                            <div
                              onClick={(e) => handleTrackSeek(e, callTotalDuration)}
                              onMouseMove={(e) => handleTrackMouseMove(e, callTotalDuration, call.id)}
                              onMouseLeave={handleTrackMouseLeave}
                              title="Click to seek"
                              style={{
                                height: '8px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {/* Filled Progress Line */}
                              <div
                                style={{
                                  width: `${progressPercent}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #a855f7, #c084fc)',
                                  borderRadius: '4px',
                                  transition: 'width 0.08s linear'
                                }}
                              />
                              {/* Scrubber Thumb */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${progressPercent}%`,
                                  transform: 'translateX(-50%)',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  border: '2px solid #a855f7',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                                  pointerEvents: 'none'
                                }}
                              />
                            </div>

                            {/* Timestamps: Current Time and Total Duration */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                              <span style={{ color: '#c084fc' }}>{formatSecs(currentTime)}</span>
                              <span>{formatSecs(callTotalDuration)}</span>
                            </div>
                          </div>

                          {/* Playback Speed Controls right next to player */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 3px',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}>
                            {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => handleSpeedChange(rate)}
                                title={`${rate}x playback speed`}
                                style={{
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  background: playbackSpeed === rate ? '#a855f7' : 'transparent',
                                  color: playbackSpeed === rate ? '#ffffff' : '#94a3b8',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {rate}x
                              </button>
                            ))}
                          </div>

                          {/* Mute / Unmute Button */}
                          <button
                            type="button"
                            onClick={handleToggleMute}
                            title={isMuted ? 'Unmute' : 'Mute'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isMuted ? '#f87171' : '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          </button>

                          {/* Close / Collapse Player Button */}
                          <button
                            type="button"
                            onClick={() => handleClosePlayer(call.id)}
                            title="Close player"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </TableCell>

                    {/* Sentiment */}
                    <TableCell>
                      <Badge variant={call.sentiment === 'POSITIVE' ? 'success' : call.sentiment === 'NEGATIVE' ? 'danger' : 'info'}>
                        {call.sentiment}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {new Date(call.created_at).toLocaleDateString()}
                    </TableCell>

                    {/* Reusable Action Buttons (Download, Delete) */}
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {/* Download Audio Action */}
                        <a
                          href={`http://localhost:8000${call.recording_url}`}
                          download={`recording_${call.id}.webm`}
                          title="Download audio recording (.webm)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            borderRadius: '8px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                        >
                          <Download size={14} />
                        </a>

                        {/* Delete Action via TableActionButtons */}
                        <TableActionButtons
                          onDelete={() => deleteMutation.mutate(call.id)}
                          itemName={`Recording #${call.id}`}
                          deleteTitle="Delete recording and call log"
                          deleteConfirmMessage="This will permanently delete the audio recording file from disk and database."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Reusable Pagination Component */}
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={totalRecordings}
          pageSizeOptions={[10, 15, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemName="recordings"
        />
      </TableContainer>
    </div>
  );
};
