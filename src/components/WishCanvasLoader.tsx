type WishCanvasLoaderProps = {
  className?: string;
};

const letters = 'WishCanvas'.split('');

const WishCanvasLoader = ({ className = '' }: WishCanvasLoaderProps) => {
  return (
    <div className={`wc-loader-shell ${className}`.trim()}>
      <div className="wc-loader-blob wc-loader-blob-a" />
      <div className="wc-loader-blob wc-loader-blob-b" />
      <div className="wc-loader-card" role="status" aria-label="Loading WishCanvas">
        <div className="wc-loader-wordmark" aria-hidden="true">
          {letters.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="wc-loader-letter"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>
        <div className="wc-loader-track" aria-hidden="true">
          <div className="wc-loader-fill" />
        </div>
      </div>
    </div>
  );
};

export default WishCanvasLoader;
