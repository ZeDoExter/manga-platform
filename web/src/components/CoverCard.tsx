import Link from 'next/link';
import type { Story } from '@/lib/data';
import { Coins, Check, Sparkles, Star } from 'lucide-react';

interface Props {
  story: Story;
}

export function CoverCard({ story }: Props) {
  const isFree = story.chapters.length > 0 && story.chapters[0].priceCoins === 0;

  return (
    <Link href={`/story/${story.id}`} className="manga-card">
      <div className="manga-thumb-wrap">
        <img
          src={story.cover}
          alt={story.title}
          className="manga-thumb"
          loading="lazy"
        />
        <div className="manga-card-shade" />

        <div className="manga-badge-pos">
          <span className="badge badge-rank-n">
            {story.type}
          </span>
        </div>

        <div className="manga-rating-pos">
          <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
          <span>{story.rating}</span>
        </div>
      </div>

      <div className="manga-body">
        <h4 className="manga-card-title">{story.title}</h4>

        <div className="manga-card-ch-info">
          <span>ตอนที่ {story.chapters.length}</span>

          {isFree ? (
            <span className="badge badge-free">
              <Sparkles style={{ width: 10, height: 10 }} /> ฟรี
            </span>
          ) : (
            <span className="badge badge-coin">
              <Coins style={{ width: 10, height: 10 }} /> 40
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
