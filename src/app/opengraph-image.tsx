import { ImageResponse } from "next/og";
import { BAR_SIDE, BAR_TOP, RING, SWOOSH, TAIL, WORDMARK } from "@/components/brand/paths";
import { site } from "@/config/site";

export const alt = `${site.name}. ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Satori needs literal colors; these are the brand tokens from globals.css. */
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 600"><defs><linearGradient id="r" x1="0" y1=".1" x2=".75" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#dfe3ec"/><stop offset=".36" stop-color="#fff"/><stop offset=".58" stop-color="#b4bac8"/><stop offset=".8" stop-color="#f7f8fb"/><stop offset="1" stop-color="#a6adbd"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#c9ceda"/><stop offset=".5" stop-color="#fbfcfd"/><stop offset="1" stop-color="#b0b7c6"/></linearGradient><linearGradient id="s" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#8f97aa"/></linearGradient></defs><path d="${TAIL}" fill="#b5bccb"/><path d="${RING}" fill="url(#r)"/><path d="${BAR_TOP}" fill="url(#b)"/><path d="${BAR_SIDE}" fill="url(#s)"/><path d="${SWOOSH}" fill="#f5101f"/></svg>`;
const word = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 572 66"><path d="${WORDMARK}" fill="#f3f5fa" fill-rule="evenodd"/></svg>`;
const back = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><radialGradient id="g" cx=".78" cy=".35" r=".8"><stop stop-color="#1b46b4" stop-opacity=".6"/><stop offset=".5" stop-color="#0f2666" stop-opacity=".3"/><stop offset="1" stop-color="#05080f" stop-opacity="0"/></radialGradient><linearGradient id="n" x1="1000" y1="0" x2="480" y2="630" gradientUnits="userSpaceOnUse"><stop stop-color="#2f5bea" stop-opacity=".3"/><stop offset="1" stop-color="#2f5bea" stop-opacity="0"/></linearGradient><radialGradient id="c" cx="1090" cy="440" r="300" gradientUnits="userSpaceOnUse"><stop stop-color="#b50816" stop-opacity=".75"/><stop offset="1" stop-color="#b50816" stop-opacity=".1"/></radialGradient></defs><rect width="1200" height="630" fill="#05080f"/><rect width="1200" height="630" fill="url(#g)"/><path d="M820 0h300L490 630H190Z" fill="url(#n)"/><path d="M1200 330v300H900Z" fill="#05080f"/><path d="M1200 330v300H900Z" fill="url(#c)"/><path d="M1200 330 900 630" stroke="#ff2233" stroke-width="3"/><path d="M1200 0 1010 190" stroke="#ff2233" stroke-width="2" opacity=".7"/></svg>`;
const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", position: "relative", color: "#fff" }}>
      <Svg svg={back} width={1200} height={630} absolute />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 84px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Svg svg={mark} width={152} height={140} />
          <div
            style={{
              width: 2,
              height: 116,
              margin: "0 36px",
              background: "linear-gradient(rgba(255,255,255,0), rgba(255,255,255,.7), rgba(255,255,255,0))",
            }}
          />
          <Svg svg={word} width={416} height={48} />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 64,
            fontSize: 54,
            letterSpacing: -1.5,
            lineHeight: 1.2,
            maxWidth: 760,
          }}
        >
          {site.tagline}
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 28, color: "#b9c3d8", maxWidth: 740 }}>
          Dedicated teams, web, accounting, cloud and IT for the USA and Canada
        </div>
      </div>
    </div>,
    size,
  );
}

function Svg({
  svg,
  width,
  height,
  absolute,
}: {
  svg: string;
  width: number;
  height: number;
  absolute?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        ...(absolute ? { position: "absolute", top: 0, left: 0 } : {}),
        backgroundImage: `url(${uri(svg)})`,
        backgroundSize: `${width}px ${height}px`,
      }}
    />
  );
}
