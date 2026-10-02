import type { Story } from '@/lib/data';
import { Coins, Check, Sparkles, BookOpen } from 'lucide-react';

interface Props {
  story: Story;
  owned?: boolean;
  showPrice?: boolean;
}

export default function CoverCard({ story, owned = false, showPrice = true }: Props) {
  const free = story.price === 0;

  return (
    <div className="cover">
      {/* Cover Image */}
      <img
        src={story.cover}
        alt={story.title}
        className="cover-art"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        loading="lazy"
      />

      {/* Progress spine on the left edge (FR-L1) */}
      {story.progress > 0 && (
        <div className="spine">
          <i style={{ height: `${story.progress}%` }} />
        </div>
      )}

      {/* Type badge */}
      <span className="type-tag">{story.type}</span>

      {/* Price / Status Hanko Stamp */}
      {showPrice &&
        (owned ? (
          <span className="hanko owned">
            <Check style={{ width: 12, height: 12 }} />
            <span>มีแล้ว</span>
          </span>
        ) : free ? (
          <span className="hanko free">
            <Sparkles style={{ width: 11, height: 11 }} />
            <span>ฟรี</span>
          </span>
        ) : (
          <span className="hanko">
            <Coins style={{ width: 11, height: 11 }} />
            <span>{story.price}</span>
          </span>
        ))}

      {/* Gradient Shade & Metadata */}
      <div className="cover-shade" />
      <div className="cover-meta">
        <b>{story.title}</b>
        <span>
          ตอนที่ {story.chapters} · {story.updatedAt}
        </span>
      </div>
    </div>
  );
}
