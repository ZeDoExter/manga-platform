import type { Story } from '@/lib/data';
import { Coins, Check, Sparkles, Star } from 'lucide-react';

interface Props {
  story: Story;
  owned?: boolean;
  showPrice?: boolean;
}

export default function CoverCard({ story, owned = false, showPrice = true }: Props) {
  const isFree = story.price === 0;

  return (
    <div className="manga-card">
      <div className="manga-thumb-wrap">
        <img
          src={story.cover}
          alt={story.title}
          className="manga-thumb"
          loading="lazy"
        />

        <div className="manga-card-shade" />

        {/* Story Type Tag */}
        <div className="manga-badge-pos">
          <span className="badge badge-rank-n">
            {story.type}
          </span>
        </div>

        {/* Rating */}
        <div className="manga-rating-pos">
          <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
          <span>{story.rating}</span>
        </div>
      </div>

      <div className="manga-body">
        <h4 className="manga-card-title">{story.title}</h4>

        <div className="manga-card-ch-info">
          <span>ตอนที่ {story.chapters}</span>

          {showPrice && (
            owned ? (
              <span className="badge" style={{ background: 'var(--surface-elevated)', color: 'var(--success)' }}>
                <Check style={{ width: 11, height: 11 }} /> ปลดแล้ว
              </span>
            ) : isFree ? (
              <span className="badge badge-free">
                <Sparkles style={{ width: 10, height: 10 }} /> ฟรี
              </span>
            ) : (
              <span className="badge badge-coin">
                <Coins style={{ width: 10, height: 10 }} /> {story.price}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
