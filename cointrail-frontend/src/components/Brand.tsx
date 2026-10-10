/** Shared presentation only; the parent owns the home link and accessible name. */
export default function Brand() {
    return <span className="ct-brand-lockup">
        <img src="/cointrail-mark.svg" alt="" width="32" height="32" />
        <span className="ct-wordmark"><span className="ct-wordmark-coin">Coin</span><span className="ct-wordmark-trail">Trail</span></span>
    </span>;
}
