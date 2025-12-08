import { WrapPlayer } from "../../components/wrap/WrapPlayer";
import { buildSlides, getWrapData } from "../../lib/wrapSlides";

export default function WrapPage() {
  const data = getWrapData();
  const slides = buildSlides(data);

  return <WrapPlayer slides={slides} />;
}
