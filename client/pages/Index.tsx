import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div className="relative flex h-screen w-full max-w-md mx-auto flex-col font-display overflow-hidden welcome-gradient">
      <div className="absolute inset-x-0 top-0 h-[70%] pointer-events-none animate-fade-in">
        <div className="relative h-full w-full">
          <img
            className="absolute inset-0 h-full w-full object-cover object-[50%_35%] saturate-210 contrast-135 brightness-105"
            alt="Healthy food"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqDz9j6l_CXZHY0v-hyrGT-UgKk86Ji4pNAXk24kqX-NekWGpjU1f6l-_6s2ux94-QgPRwuF8vwOVniQ67C3s4-s9ctWaeOflNwPr0Xtbm_efTNCsQtq4WwZ8fBu-ZVaNs_DX_UL4ADYobxtHvtlDvG6kdcEBnwBPgCzzHplXbpL_oRW8aqQnpFmSKItYlyPfpX-nuoFA54lLYPvowImzZMIHD3dD1w79t6OHZlEyi9zSNPcVs2fGdOgcPueRtMTEp264hxTTbfa6R"
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
              radial-gradient(ellipse at center 35%, transparent 40%, rgba(247, 247, 247, 0.85) 85%),
              linear-gradient(to top, #f7f7f7 0%, transparent 15%)
            `,
            }}
          />
        </div>
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full w-full">
        <header className="flex h-11 shrink-0 items-center justify-start px-6 pt-3 text-black" />
        <main className="flex-grow flex flex-col justify-end px-4 pb-8">
          <div className="w-full px-4 text-left">
            <h1 className="text-black tracking-tight text-[34px] font-bold leading-tight">
              Start Your Journey
            </h1>
            <p className="text-black text-lg font-normal leading-relaxed pt-3">
              Personalized meal plans for a healthier you.
            </p>
          </div>
        </main>
        <footer className="w-full shrink-0 pb-4">
          <div className="flex px-4 py-3">
            <Link
              to="/auth"
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 flex-1 bg-black text-white text-lg font-medium leading-normal tracking-wide w-full"
            >
              <span className="truncate">Get Started</span>
            </Link>
          </div>
          <div className="flex justify-center items-center pt-3">
            <div className="w-36 h-1.5 bg-black rounded-full" />
          </div>
        </footer>
      </div>
    </div>
  );
}
