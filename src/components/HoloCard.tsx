import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export type HoloCardVariant = 'payment' | 'dashboard' | 'product' | 'editorial';
export type HoloCardIntensity = 'full' | 'subtle';

interface HoloState {
  rx: number;
  ry: number;
  px: number;
  py: number;
  active: boolean;
}

const REST_STATE: HoloState = {
  rx: 0,
  ry: 0,
  px: 50,
  py: 50,
  active: false,
};

interface CommonHoloProps {
  variant?: HoloCardVariant;
  intensity?: HoloCardIntensity;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
}

type DivHoloProps = CommonHoloProps & {
  as?: 'div' | 'article' | 'section';
} & Omit<HTMLAttributes<HTMLElement>, keyof CommonHoloProps>;

type ButtonHoloProps = CommonHoloProps & {
  as: 'button';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonHoloProps>;

export type HoloCardProps = DivHoloProps | ButtonHoloProps;

export function HoloCard(props: HoloCardProps) {
  const {
    variant = 'dashboard',
    intensity,
    disabled = false,
    children,
    className = '',
    contentClassName = '',
    style,
    as = 'div',
    ...rest
  } = props;

  const resolvedIntensity: HoloCardIntensity =
    intensity ?? (variant === 'payment' || variant === 'product' ? 'full' : 'subtle');
  const maxTiltDeg = resolvedIntensity === 'full' ? 14 : 7;

  const cardRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HoloState>(REST_STATE);
  const currentRef = useRef<HoloState>(REST_STATE);
  const velRef = useRef<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const applyVarsToDom = (state: HoloState) => {
    const el = cardRef.current;
    if (!el) return;
    const hueDeg = Math.round(((state.rx + state.ry) / (maxTiltDeg * 2 || 1)) * 120 + (state.px - 50) * 1.4);
    const sparkleX = ((50 - state.px) * 0.48).toFixed(1);
    const sparkleY = ((50 - state.py) * 0.48).toFixed(1);
    el.style.setProperty('--holo-rx', `${state.rx.toFixed(2)}deg`);
    el.style.setProperty('--holo-ry', `${state.ry.toFixed(2)}deg`);
    el.style.setProperty('--holo-glare-x', `${state.px.toFixed(1)}%`);
    el.style.setProperty('--holo-glare-y', `${state.py.toFixed(1)}%`);
    el.style.setProperty('--holo-pos-x', `${(20 + state.px * 0.6).toFixed(1)}%`);
    el.style.setProperty('--holo-pos-y', `${(20 + state.py * 0.6).toFixed(1)}%`);
    el.style.setProperty('--holo-hue', `${hueDeg}deg`);
    el.style.setProperty('--holo-sparkle-x', `${sparkleX}px`);
    el.style.setProperty('--holo-sparkle-y', `${sparkleY}px`);
    el.style.setProperty('--holo-active', state.active ? '1' : '0');
  };

  useEffect(() => {
    applyVarsToDom(REST_STATE);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxTiltDeg]);

  const startSpringLoop = () => {
    if (rafRef.current !== null) return;
    const stiffness = 0.19;
    const damping = 0.72;

    const tick = () => {
      const target = targetRef.current;
      const cur = currentRef.current;
      const vel = velRef.current;

      vel.rx = (vel.rx + (target.rx - cur.rx) * stiffness) * damping;
      vel.ry = (vel.ry + (target.ry - cur.ry) * stiffness) * damping;

      cur.rx += vel.rx;
      cur.ry += vel.ry;
      cur.px += (target.px - cur.px) * 0.24;
      cur.py += (target.py - cur.py) * 0.24;
      cur.active = target.active;

      applyVarsToDom(cur);

      const settled =
        !target.active &&
        Math.abs(target.rx - cur.rx) < 0.04 &&
        Math.abs(target.ry - cur.ry) < 0.04 &&
        Math.abs(vel.rx) < 0.03 &&
        Math.abs(vel.ry) < 0.03;

      if (settled) {
        currentRef.current = { ...REST_STATE };
        velRef.current = { rx: 0, ry: 0 };
        applyVarsToDom(REST_STATE);
        rafRef.current = null;
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (disabled) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const dx = (normX - 0.5) * 2; // -1 to 1
    const dy = (normY - 0.5) * 2; // -1 to 1

    // Card tilts toward the pointer: moving pointer right tilts right edge forward (+ry),
    // moving pointer down tilts bottom edge forward (-rx).
    targetRef.current = {
      rx: -dy * maxTiltDeg,
      ry: dx * maxTiltDeg,
      px: normX * 100,
      py: normY * 100,
      active: true,
    };
    if (!active) setActive(true);
    startSpringLoop();
  };

  const handlePointerLeave = () => {
    targetRef.current = { ...REST_STATE };
    if (active) setActive(false);
    startSpringLoop();
  };

  const mergedClassName = `ravfina-holo-card overflow-hidden ${className}`.trim();

  const innerContent = (
    <>
      <div className="ravfina-holo-foil" aria-hidden="true" />
      <div className="ravfina-holo-glare" aria-hidden="true" />
      <div className="ravfina-holo-sparkle" aria-hidden="true" />
      <div className={`ravfina-holo-content h-full w-full ${contentClassName}`.trim()}>
        {children}
      </div>
    </>
  );

  if (as === 'button') {
    const btnProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        ref={(node) => {
          cardRef.current = node;
        }}
        data-holo-card="true"
        data-holo-variant={variant}
        data-holo-intensity={resolvedIntensity}
        data-holo-active={active ? '1' : '0'}
        onPointerMove={(e) => {
          handlePointerMove(e);
          btnProps.onPointerMove?.(e);
        }}
        onPointerLeave={(e) => {
          handlePointerLeave();
          btnProps.onPointerLeave?.(e);
        }}
        className={mergedClassName}
        style={style}
        {...btnProps}
      >
        {innerContent}
      </button>
    );
  }

  const Tag = as;
  const htmlProps = rest as HTMLAttributes<HTMLElement>;

  return (
    <Tag
      ref={(node) => {
        cardRef.current = node;
      }}
      data-holo-card="true"
      data-holo-variant={variant}
      data-holo-intensity={resolvedIntensity}
      data-holo-active={active ? '1' : '0'}
      onPointerMove={(e) => {
        handlePointerMove(e);
        htmlProps.onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        handlePointerLeave();
        htmlProps.onPointerLeave?.(e);
      }}
      className={mergedClassName}
      style={style}
      {...htmlProps}
    >
      {innerContent}
    </Tag>
  );
}

interface HoloCardLayerProps {
  depth?: number;
  className?: string;
  children: ReactNode;
}

export function HoloCardLayer({ depth = 16, className = '', children }: HoloCardLayerProps) {
  return (
    <div
      className={`ravfina-holo-layer ${className}`.trim()}
      style={{ '--holo-z': `${depth}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}
