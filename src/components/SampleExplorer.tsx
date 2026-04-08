import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://brokerage.humanoids.fyi/v1';

interface ManifestEpisode {
  id: string;
  video: string;
  title?: string;
  duration_seconds?: number;
  thumbnail?: string;
  annotations?: string;
  instruction?: string;
  tags?: Record<string, string>;
  files?: Record<string, string>;
}

interface ManifestResponse {
  listing_title: string;
  listing_slug: string;
  provider_name: string | null;
  provider_slug: string | null;
  modality: string;
  environment: string;
  tags: string[];
  total_hours: number | null;
  price_per_hour: number;
  currency: string;
  minimum_hours: number;
  episode_count: number;
  total_duration_hours: number;
  tag_facets: Record<string, Record<string, number>>;
  base_url: string;
  manifest: { version: number; episodes: ManifestEpisode[] };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatHours(hours: number): string {
  return hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} hrs`;
}

// ─── EPISODE CARD ──────────────────────────────────────────

function EpisodeCard({ episode, baseUrl, onClick, isSelected }: {
  episode: ManifestEpisode; baseUrl: string; onClick: () => void; isSelected: boolean;
}) {
  const [thumbError, setThumbError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolveUrl = (path: string) =>
    path.startsWith('http://') || path.startsWith('https://') ? path : `${baseUrl}${path}`;

  const thumbnailUrl = episode.thumbnail ? resolveUrl(episode.thumbnail) : null;
  const videoUrl = resolveUrl(episode.video);
  const primaryTag = episode.tags ? Object.values(episode.tags)[0] : null;

  // Lazy-load video metadata via IntersectionObserver
  useEffect(() => {
    if (thumbnailUrl && !thumbError) return; // Using thumbnail, skip video preload
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.preload = 'metadata';
        el.src = videoUrl;
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [thumbnailUrl, thumbError, videoUrl]);

  return (
    <div ref={cardRef} className={`se-card${isSelected ? ' se-card--selected' : ''}`} onClick={onClick}>
      <div className="se-card__thumb">
        {thumbnailUrl && !thumbError ? (
          <img src={thumbnailUrl} alt={episode.id} loading="lazy" onError={() => setThumbError(true)} />
        ) : (
          <>
            <video ref={videoRef} muted playsInline preload="none"
              style={{ display: videoLoaded ? 'block' : 'none' }}
              onLoadedMetadata={() => setVideoLoaded(true)} />
            {!videoLoaded && (
              <div className="se-card__placeholder">
                <span className="se-card__play-icon">&#9654;</span>
                <span>{episode.id}</span>
              </div>
            )}
          </>
        )}
        <div className="se-card__overlay">
          <span className="se-card__play-icon">&#9654;</span>
          {episode.instruction && (
            <p className="se-card__instruction">{episode.instruction.length > 120 ? episode.instruction.slice(0, 120) + '...' : episode.instruction}</p>
          )}
        </div>
      </div>
      <div className="se-card__meta">
        <span className="se-card__id">{episode.title || episode.id}</span>
        <span className="se-card__info">
          {episode.duration_seconds ? formatDuration(episode.duration_seconds) : ''}
          {primaryTag ? ` · ${primaryTag.replace(/_/g, ' ')}` : ''}
        </span>
      </div>
    </div>
  );
}

// ─── EPISODE EXPANDED ──────────────────────────────────────

function EpisodeExpanded({ episode, baseUrl, onClose, onPrev, onNext, hasPrev, hasNext }: {
  episode: ManifestEpisode; baseUrl: string; onClose: () => void; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean;
}) {
  const [annotations, setAnnotations] = useState<Record<string, unknown> | unknown[] | null>(null);
  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState('');

  const resolveUrl = (path: string) =>
    path.startsWith('http://') || path.startsWith('https://') ? path : `${baseUrl}${path}`;

  const videoUrl = resolveUrl(episode.video);

  // Fetch annotations lazily
  useEffect(() => {
    if (!episode.annotations) return;
    setAnnLoading(true);
    setAnnError('');
    setAnnotations(null);
    const url = resolveUrl(episode.annotations);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { setAnnotations(data); setAnnLoading(false); })
      .catch(err => { setAnnError(err.message); setAnnLoading(false); });
  }, [episode.id, episode.annotations, baseUrl]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="se-expanded">
      <div className="se-expanded__header">
        <span className="se-expanded__title">{episode.title || episode.id}</span>
        <button className="se-expanded__close" onClick={onClose}>&times;</button>
      </div>
      <div className="se-expanded__body">
        <div className="se-expanded__video">
          <video key={episode.id} controls autoPlay preload="auto" src={videoUrl}>
            Your browser does not support video playback.
          </video>
        </div>
        <div className="se-expanded__info">
          <div className="se-expanded__meta-grid">
            {episode.duration_seconds && <div><span className="se-expanded__label">Duration</span><span>{formatDuration(episode.duration_seconds)}</span></div>}
            {episode.tags && Object.entries(episode.tags).map(([k, v]) => (
              <div key={k}><span className="se-expanded__label">{k.replace(/_/g, ' ')}</span><span>{v.replace(/_/g, ' ')}</span></div>
            ))}
          </div>
          {episode.instruction && (
            <div className="se-expanded__instruction">
              <span className="se-expanded__label">Instruction</span>
              <p>{episode.instruction}</p>
            </div>
          )}

          {/* Multi-modality files */}
          {episode.files && Object.keys(episode.files).length > 1 && (
            <div className="se-expanded__files">
              <span className="se-expanded__label">Modality Files</span>
              {Object.entries(episode.files).map(([mod, path]) => (
                <a key={mod} className="se-expanded__file-link" href={resolveUrl(path)} target="_blank" rel="noopener noreferrer">
                  {mod.replace(/_/g, ' ')} &darr;
                </a>
              ))}
            </div>
          )}

          {/* Annotations */}
          {episode.annotations && (
            <div className="se-expanded__annotations">
              <span className="se-expanded__label">Annotations</span>
              {annLoading && <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>Loading...</p>}
              {annError && <p style={{ fontSize: 10, color: 'var(--red)' }}>Failed to load: {annError}</p>}
              {annotations && (
                <pre className="se-expanded__json">{JSON.stringify(annotations, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="se-expanded__nav">
        <a className="se-expanded__download" href={videoUrl} target="_blank" rel="noopener noreferrer">Download Video</a>
        {episode.annotations && <a className="se-expanded__download" href={resolveUrl(episode.annotations)} target="_blank" rel="noopener noreferrer">Download Annotations</a>}
        <div className="se-expanded__arrows">
          <button className="se-expanded__arrow" onClick={onPrev} disabled={!hasPrev}>&larr; Prev</button>
          <button className="se-expanded__arrow" onClick={onNext} disabled={!hasNext}>Next &rarr;</button>
        </div>
      </div>
    </div>
  );
}

// ─── EXPLORER FILTERS ──────────────────────────────────────

function ExplorerFilters({ tagFacets, selectedTags, onTagToggle, durationFilter, onDurationChange, searchQuery, onSearchChange, onClearAll }: {
  tagFacets: Record<string, Record<string, number>>;
  selectedTags: Record<string, Set<string>>;
  onTagToggle: (category: string, value: string) => void;
  durationFilter: string;
  onDurationChange: (v: string) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onClearAll: () => void;
}) {
  const hasFilters = Object.values(selectedTags).some(s => s.size > 0) || durationFilter !== 'all' || searchQuery !== '';

  return (
    <div className="se-filters">
      <input className="se-filters__search" placeholder="Search instructions..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} />

      {Object.entries(tagFacets).map(([category, values]) => (
        <div key={category} className="se-filters__group">
          <div className="se-filters__group-title">{category.replace(/_/g, ' ')}</div>
          {Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([value, count]) => (
            <label key={value} className="se-filters__item">
              <input type="checkbox" checked={selectedTags[category]?.has(value) ?? false} onChange={() => onTagToggle(category, value)} />
              <span>{value.replace(/_/g, ' ')}</span>
              <span className="se-filters__count">{count}</span>
            </label>
          ))}
        </div>
      ))}

      <div className="se-filters__group">
        <div className="se-filters__group-title">Duration</div>
        {[['all', 'All'], ['short', '< 10 min'], ['medium', '10-20 min'], ['long', '> 20 min']].map(([val, label]) => (
          <label key={val} className="se-filters__item">
            <input type="radio" name="duration" checked={durationFilter === val} onChange={() => onDurationChange(val)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {hasFilters && (
        <button className="se-filters__clear" onClick={onClearAll}>Clear all filters</button>
      )}
    </div>
  );
}

// ─── SAMPLE EXPLORER (TOP LEVEL) ───────────────────────────

const EPISODES_PER_PAGE = 24;

export default function SampleExplorer({ slug }: { slug: string }) {
  const [data, setData] = useState<ManifestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [selectedTags, setSelectedTags] = useState<Record<string, Set<string>>>({});
  const [durationFilter, setDurationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch manifest
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/catalog/${slug}/manifest`)
      .then(r => { if (!r.ok) throw new Error(r.status === 404 ? 'Listing not found' : `HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  // Filter episodes
  const filteredEpisodes = useMemo(() => {
    if (!data) return [];
    return data.manifest.episodes.filter(ep => {
      // Tag filters
      for (const [category, selected] of Object.entries(selectedTags)) {
        if (selected.size === 0) continue;
        const epValue = ep.tags?.[category];
        if (!epValue || !selected.has(epValue)) return false;
      }
      // Duration filter
      if (durationFilter !== 'all' && ep.duration_seconds) {
        const mins = ep.duration_seconds / 60;
        if (durationFilter === 'short' && mins >= 10) return false;
        if (durationFilter === 'medium' && (mins < 10 || mins > 20)) return false;
        if (durationFilter === 'long' && mins <= 20) return false;
      }
      // Text search
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const searchable = `${ep.id} ${ep.title ?? ''} ${ep.instruction ?? ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [data, selectedTags, durationFilter, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE);
  const pageEpisodes = filteredEpisodes.slice((currentPage - 1) * EPISODES_PER_PAGE, currentPage * EPISODES_PER_PAGE);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [selectedTags, durationFilter, debouncedSearch]);

  // Selected episode
  const selectedEpisode = useMemo(() => {
    if (!selectedEpisodeId || !data) return null;
    return data.manifest.episodes.find(ep => ep.id === selectedEpisodeId) ?? null;
  }, [selectedEpisodeId, data]);

  const selectedIndex = useMemo(() => {
    if (!selectedEpisodeId) return -1;
    return filteredEpisodes.findIndex(ep => ep.id === selectedEpisodeId);
  }, [selectedEpisodeId, filteredEpisodes]);

  const handleTagToggle = useCallback((category: string, value: string) => {
    setSelectedTags(prev => {
      const next = { ...prev };
      const set = new Set(next[category] ?? []);
      if (set.has(value)) set.delete(value); else set.add(value);
      next[category] = set;
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTags({});
    setDurationFilter('all');
    setSearchQuery('');
  }, []);

  const handlePrev = useCallback(() => {
    if (selectedIndex > 0) setSelectedEpisodeId(filteredEpisodes[selectedIndex - 1].id);
  }, [selectedIndex, filteredEpisodes]);

  const handleNext = useCallback(() => {
    if (selectedIndex < filteredEpisodes.length - 1) setSelectedEpisodeId(filteredEpisodes[selectedIndex + 1].id);
  }, [selectedIndex, filteredEpisodes]);

  // ─── RENDER ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="se-page">
        <div className="se-header">
          <a className="se-header__back" href={`/data/buy#listing-${slug}`}>&larr; Back to Listing</a>
        </div>
        <div className="se-loading">
          <div className="se-loading__skeleton" /><div className="se-loading__skeleton" /><div className="se-loading__skeleton" />
          <div className="se-loading__skeleton" /><div className="se-loading__skeleton" /><div className="se-loading__skeleton" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="se-page">
        <div className="se-header">
          <a className="se-header__back" href="/data/buy">&larr; Back to Catalog</a>
        </div>
        <div className="se-error">
          <p>{error || 'Sample data not available'}</p>
          <a href="/data/buy">Browse the catalog</a>
        </div>
      </div>
    );
  }

  const avgDuration = data.episode_count > 0 && data.total_duration_hours > 0
    ? (data.total_duration_hours * 3600) / data.episode_count : 0;

  return (
    <div className="se-page">
      {/* Header */}
      <div className="se-header">
        <a className="se-header__back" href={`/data/buy`} onClick={e => { e.preventDefault(); window.history.back(); }}>&larr; Back to Listing</a>
        <div className="se-header__info">
          <h1 className="se-header__title">{data.listing_title}</h1>
          <p className="se-header__sub">
            by {data.provider_name ?? 'Provider'}
            {data.total_hours ? ` · ${Number(data.total_hours).toLocaleString()} hrs available` : ''}
            {` · $${data.price_per_hour}/hr`}
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="se-stats">
        <span className="se-stats__item">{data.episode_count} episodes</span>
        <span className="se-stats__sep">·</span>
        <span className="se-stats__item">{formatHours(data.total_duration_hours)}</span>
        <span className="se-stats__sep">·</span>
        <span className="se-stats__item">avg {avgDuration > 0 ? formatDuration(avgDuration) : '—'}/episode</span>
      </div>

      {/* Mobile filter toggle */}
      <button className="se-filters-toggle" onClick={() => setFiltersOpen(o => !o)}>
        {filtersOpen ? 'Hide Filters' : 'Filters'}
        {Object.values(selectedTags).some(s => s.size > 0) || durationFilter !== 'all' || searchQuery ? ' (active)' : ''}
      </button>

      {/* Main content */}
      <div className="se-content">
        <div className={`se-sidebar${filtersOpen ? ' se-sidebar--open' : ''}`}>
          <ExplorerFilters
            tagFacets={data.tag_facets}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
            durationFilter={durationFilter}
            onDurationChange={setDurationFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearAll={handleClearAll}
          />
        </div>

        <div className="se-main" ref={gridRef}>
          {/* Expanded Episode */}
          {selectedEpisode && (
            <EpisodeExpanded
              episode={selectedEpisode}
              baseUrl={data.base_url}
              onClose={() => setSelectedEpisodeId(null)}
              onPrev={handlePrev}
              onNext={handleNext}
              hasPrev={selectedIndex > 0}
              hasNext={selectedIndex < filteredEpisodes.length - 1}
            />
          )}

          {/* Episode Grid */}
          <div className="se-grid">
            {pageEpisodes.map(ep => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                baseUrl={data.base_url}
                onClick={() => setSelectedEpisodeId(ep.id === selectedEpisodeId ? null : ep.id)}
                isSelected={ep.id === selectedEpisodeId}
              />
            ))}
          </div>

          {filteredEpisodes.length === 0 && (
            <div className="se-empty">No episodes match your filters</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="se-pagination">
              <span className="se-pagination__info">
                Showing {(currentPage - 1) * EPISODES_PER_PAGE + 1}–{Math.min(currentPage * EPISODES_PER_PAGE, filteredEpisodes.length)} of {filteredEpisodes.length}
              </span>
              <div className="se-pagination__buttons">
                <button disabled={currentPage <= 1} onClick={() => { setCurrentPage(p => p - 1); gridRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>&larr;</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  return (
                    <button key={page} className={page === currentPage ? 'se-pagination__active' : ''} onClick={() => { setCurrentPage(page); gridRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>
                      {page}
                    </button>
                  );
                })}
                <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => p + 1); gridRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>&rarr;</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
