export default function PizzaScene() {
  return (
    <div aria-hidden="true" className="relative h-full w-full overflow-hidden rounded-sm bg-[#f8f2e8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.96),transparent_34%),radial-gradient(circle_at_72%_28%,rgba(255,201,120,0.24),transparent_24%),linear-gradient(135deg,#f4ebdd_0%,#f9f3ea_60%,#f2e5d0_100%)]" />

      <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-[#f9f8f3] bg-[#f9f8f3] shadow-[0_20px_40px_rgba(28,24,20,0.12)]" />
      <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-[12px] border-[#d9b06a] bg-[radial-gradient(circle_at_center,#f5d28d_0%,#f0bb61_58%,#d59b42_100%)] shadow-inner" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_45%,#e7a13d_0%,#c5641d_35%,#a9421a_100%)] opacity-95" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,#f5d780_0%,#efbf62_38%,#ddb15c_100%)]" />

      {[
        { left: "41%", top: "38%", size: 16, color: "#7f2d18" },
        { left: "52%", top: "42%", size: 18, color: "#8a2e1c" },
        { left: "46%", top: "54%", size: 14, color: "#8e2f1c" },
        { left: "58%", top: "52%", size: 17, color: "#7f2d18" },
        { left: "36%", top: "48%", size: 16, color: "#8d2d1a" },
        { left: "56%", top: "63%", size: 15, color: "#882d1b" },
        { left: "41%", top: "60%", size: 17, color: "#872f1d" },
      ].map((pepperoni, index) => (
        <div
          key={index}
          className="absolute rounded-full"
          style={{
            left: pepperoni.left,
            top: pepperoni.top,
            width: `${pepperoni.size}px`,
            height: `${pepperoni.size}px`,
            background: pepperoni.color,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
          }}
        />
      ))}

      <div className="absolute left-[52%] top-[28%] h-12 w-20 -translate-x-1/2 rotate-[18deg] rounded-full bg-[#4a7b3a] opacity-90" />
      <div className="absolute left-[40%] top-[51%] h-10 w-20 -translate-x-1/2 rotate-[-10deg] rounded-full bg-[#4a7b3a] opacity-90" />
      <div className="absolute left-[60%] top-[46%] h-12 w-20 -translate-x-1/2 rotate-[12deg] rounded-full bg-[#4a7b3a] opacity-90" />

      <div className="absolute left-[68%] top-[44%] h-20 w-16 -translate-x-1/2 rounded-[44%_44%_52%_52%/66%_66%_34%_34%] bg-[linear-gradient(180deg,#f4c49a_0%,#ef8d1d_50%,#d98517_100%)] shadow-[0_8px_18px_rgba(136,64,20,0.25)]" />
      <div className="absolute left-[68%] top-[44%] h-20 w-16 -translate-x-1/2 rounded-[44%_44%_52%_52%/66%_66%_34%_34%] border border-white/40" />
      <div className="absolute left-[74%] top-[31%] h-16 w-8 -rotate-[18deg] rounded-full bg-[#a66525]" />
      <div className="absolute left-[68%] top-[25%] h-7 w-12 rounded-full bg-[#f0ecdf]" />
      <div className="absolute left-[58%] top-[18%] h-5 w-7 rounded-full bg-[#f3b34b]" />

      <div className="absolute left-[20%] top-[57%] h-24 w-36 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(33,25,20,0.16),rgba(33,25,20,0)_70%)] blur-xl" />
      <div className="absolute left-[68%] top-[63%] h-20 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(33,25,20,0.18),rgba(33,25,20,0)_72%)] blur-xl" />
    </div>
  );
}
