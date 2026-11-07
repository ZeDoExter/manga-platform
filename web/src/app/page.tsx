import { Hero } from "@/components/Hero";
import { Top10 } from "@/components/Top10";
import { TasteLab } from "@/components/TasteLab";
import { SectionHead } from "@/components/ui";
import { ContinueReading, CreatorSpotlight, GenreStrip, NewUpdates, StudioBanner, Ticker, TopSummary, Trending } from "@/components/HomeSections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Ticker />

      <section className="wrap mt-14">
        <SectionHead kicker="// pick up where you left off" title="Continue reading" jp="続きを読む" />
        <ContinueReading />
      </section>

      <section className="mt-20" aria-labelledby="top10-h">
        <div className="wrap">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="label">{"// ranked by weekly readers · refreshed every Monday"}</div>
              <h2 id="top10-h" className="h-display mt-1 text-4xl md:text-6xl">
                Top <span className="text-accent">10</span>
                <span className="ml-3 align-top font-sans text-sm font-extrabold text-accent">今週のトップ10</span>
              </h2>
            </div>
            <TopSummary />
          </div>
          <Top10 />
        </div>
      </section>

      <section className="wrap mt-20 lg:hidden">
        <SectionHead kicker="// what readers are devouring" title="Trending now" jp="急上昇" />
        <Trending />
      </section>

      <section className="wrap mt-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <SectionHead kicker="// fresh ink" title="Newly updated" jp="新着" />
            <NewUpdates />
          </div>
          <aside className="hidden lg:block" aria-label="Trending now and genres">
            <div className="mb-4">
              <div className="label">{"// what readers are devouring"}</div>
              <h2 className="h-display mt-1 text-2xl">Trending now</h2>
            </div>
            <Trending variant="list" />
            <div className="mb-4 mt-8">
              <div className="label">{"// jump into a genre"}</div>
              <h2 className="h-display mt-1 text-2xl">Browse by genre</h2>
            </div>
            <GenreStrip />
          </aside>
        </div>
      </section>

      <section className="wrap mt-24">
        <SectionHead kicker="// original feature · taste lab" title="Recommendations that explain themselves" jp="あなたへ" />
        <TasteLab />
      </section>

      <section className="wrap mt-24">
        <SectionHead kicker="// the people behind the pages" title="Creator spotlight" jp="注目の作家" />
        <CreatorSpotlight />
      </section>

      <section className="wrap mt-24">
        <StudioBanner />
      </section>

      <section className="wrap mt-24 lg:hidden">
        <SectionHead kicker="// jump into a genre" title="Browse by genre" jp="ジャンル" />
        <GenreStrip />
      </section>
    </>
  );
}
