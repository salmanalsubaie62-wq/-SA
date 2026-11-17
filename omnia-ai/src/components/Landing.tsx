import Link from "next/link";

/** Public front page for OMNIA. Copy describes only what the product does today. */
export function Landing({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp" dir="ltr">
      <div className="lp-wrap">
        <header className="lp-top">
          <span className="lp-mast">OMNIA AI</span>
          <span className="lp-meta">Self-hosted</span>
        </header>

        <section className="lp-grid">
          <div>
            <h1 className="lp-h1">
              Ask, make, <em>check.</em>
            </h1>
            <div className="lp-ar" lang="ar">أومنيا</div>
            <p className="lp-lede">
              A chat, an image maker, a research tool that shows its sources, a document reader, a code helper
              and a few agents, all in one place. It runs on your server and only answers when you have
              connected a model provider.
            </p>
          </div>
          <div className="lp-auth-slot">{children}</div>
        </section>

        <section className="lp-sec" aria-labelledby="what">
          <div className="lp-sec-head">
            <span className="lp-num">01</span>
            <h2 id="what">What it does</h2>
          </div>
          <ul className="lp-list">
            {ROWS.map((r) => (
              <li key={r.name} className="lp-row">
                <span className="lp-idx">{r.idx}</span>
                <span className="lp-name">{r.name}</span>
                <span className="lp-desc">
                  {r.body}
                  <span className="lp-need">{r.need}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-sec lp-sec-short" aria-labelledby="keys">
          <div className="lp-sec-head">
            <span className="lp-num">02</span>
            <h2 id="keys">What is connected</h2>
          </div>
          <p className="lp-quiet">
            A feature works once its key is set on the server. Keys stay on the server. If a key is missing,
            the app says so.
          </p>
          <div className="lp-keys">
            <span>ANTHROPIC_API_KEY</span>
            <span>OPENAI_API_KEY</span>
            <span>GOOGLE_API_KEY</span>
            <span>BRAVE_SEARCH_API_KEY</span>
          </div>
          <p className="lp-quiet">
            The first account you create becomes the administrator. Create one on the right, or sign in if you
            already have one.
          </p>
        </section>

        <footer className="lp-foot">
          <span>Runs on Next.js with a SQLite database. Your data stays on the machine it runs on.</span>
          <span>© OMNIA AI</span>
        </footer>
      </div>
    </div>
  );
}

const ROWS = [
  { idx: "a.", name: "Chat", body: "Ask a question, attach a PDF, a spreadsheet or a photo. The model that fits the task answers.", need: "Needs one chat provider key." },
  { idx: "b.", name: "Images", body: "Describe the picture, choose a shape and a style. The file goes into your gallery.", need: "Needs OPENAI_API_KEY." },
  { idx: "c.", name: "Research", body: "Searches the web, reads the pages, and links each claim to the page it came from.", need: "Needs BRAVE_SEARCH_API_KEY. Without it, answers are marked as not checked." },
  { idx: "d.", name: "Documents", body: "Summaries, tables and key facts from PDF, Word, Excel and PowerPoint files.", need: "Needs a chat provider key." },
  { idx: "e.", name: "Code", body: "Writes, fixes and explains code. Web pages preview in a sandbox. Other languages are not run on the server.", need: "Needs a chat provider key for AI actions." },
  { idx: "f.", name: "Video", body: "A script, scenes and camera notes for a video. Clip rendering is not connected yet.", need: "Storyboards only." },
];
