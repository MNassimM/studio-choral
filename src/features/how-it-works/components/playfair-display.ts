import { Playfair_Display } from "next/font/google";

// Police serif propre à cette page, pour ses grands titres éditoriaux. Le
// reste du site garde Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export { playfairDisplay };
