import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pagePath = path.join(root, "src/pages/BirthdayPage.tsx");
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, "birthday-vm-keys.json"), "utf8"));

const vmObject = `asBirthdayViewModel({
${keys.map((k) => `    ${k},`).join("\n")}
  })`;

const insertBlock = `      {showRevealIntro && (
        <Suspense fallback={null}>
          <LazyRevealIntroOverlay />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <LazyMobileStorySection />
      </Suspense>

      <Suspense fallback={null}>
        <LazyBentoStorySections />
      </Suspense>

      {effectiveViewMode === 'freeform' && hasMessages && (
        <Suspense fallback={null}>
          <LazyFreeformSection />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <LazyDesktopStorySection />
      </Suspense>
`;

const lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);

const startMarker = "      {showRevealIntro && (";
const endMarker = "      </section>";
let startIdx = lines.findIndex((l) => l === startMarker);
if (startIdx === -1) {
  throw new Error("start marker not found");
}
// Last </section> before BirthdayShareCard (desktop story section end)
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i] === "      </section>" && lines[i + 2]?.trimStart().startsWith("<BirthdayShareCard")) {
    endIdx = i;
    break;
  }
}
if (endIdx === -1) {
  throw new Error("end marker not found");
}

const before = lines.slice(0, startIdx).join("\n");
const after = lines.slice(endIdx + 1).join("\n");

const vmDecl = `  const birthdayViewModel = ${vmObject};

`;

const out =
  before +
  "\n" +
  insertBlock +
  "\n" +
  after;

// Insert birthdayViewModel before main return (first "  return (" after isBeforeBirthday block)
const returnNeedle = `  return (
    <div
      className={cn(
        'relative transition-colors duration-500',`;
if (!out.includes(returnNeedle)) {
  throw new Error("return needle not found — file may have changed");
}

const wrappedReturn = `  return (
    <BirthdayPageViewProvider value={birthdayViewModel}>
    <div
      className={cn(
        'relative transition-colors duration-500',`;

const out2 = out.replace(returnNeedle, vmDecl + wrappedReturn);

const closeNeedle = `      {startYoutube && ytId && (
        <iframe
          ref={youtubeIframeRef}
          className="hidden"
          src={\`https://www.youtube.com/embed/\${ytId}?enablejsapi=1&autoplay=1&controls=0&mute=0\`}
          allow="autoplay"
        />
      )}
    </div>
  );`;

const closeReplace = `      {startYoutube && ytId && (
        <iframe
          ref={youtubeIframeRef}
          className="hidden"
          src={\`https://www.youtube.com/embed/\${ytId}?enablejsapi=1&autoplay=1&controls=0&mute=0\`}
          allow="autoplay"
        />
      )}
    </div>
    </BirthdayPageViewProvider>
  );`;

if (!out2.includes(closeNeedle)) {
  throw new Error("close needle not found");
}

const out3 = out2.replace(closeNeedle, closeReplace);

fs.writeFileSync(pagePath, out3, "utf8");
console.log("Wired BirthdayPage.tsx: removed lines", startIdx + 1, "-", endIdx + 1, "inclusive");
