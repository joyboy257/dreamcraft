import { getFragmentCopy } from "./uiModel";

interface FragmentNoticeProps {
  issueCode?: string | null;
  onEnterFragment: () => void;
  onTryAgain: () => void;
}

export function FragmentNotice({ issueCode = null, onEnterFragment, onTryAgain }: FragmentNoticeProps): React.JSX.Element {
  const copy = getFragmentCopy(issueCode);
  return (
    <section className="dc-fragment" role="alert" aria-labelledby="dc-fragment-title">
      <span aria-hidden="true">◌</span>
      <div>
        <p className="dc-kicker">Stable fragment</p>
        <h2 id="dc-fragment-title">{copy.heading}</h2>
        <p>{copy.message}</p>
      </div>
      <div className="dc-fragment-actions">
        <button className="dc-primary-action" type="button" onClick={onEnterFragment}>Enter the fragment</button>
        <button className="dc-text-button" type="button" onClick={onTryAgain}>Try this dream again</button>
      </div>
    </section>
  );
}
