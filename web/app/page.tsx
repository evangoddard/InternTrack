import Header from "@/components/Header";
import JobBoard from "@/components/JobBoard";
import MatchPanel from "@/components/MatchPanel";
import Footer from "@/components/Footer";
import { postings } from "@/lib/data";

export default function Home() {
  return (
    <>
      <div className="hero-gradient rounded-b-[2.5rem] pb-6">
        <Header />
      </div>
      <main className="flex-1">
        <JobBoard postings={postings} />
        <MatchPanel postings={postings} />
      </main>
      <Footer />
    </>
  );
}
