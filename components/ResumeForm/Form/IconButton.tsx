import { IconButton } from "components/Button";
import { Eye, EyeOff, ChevronUp, ChevronDown, Trash2, List } from "lucide-react";

export const ShowIconButton = ({
  show,
  setShow,
}: {
  show: boolean;
  setShow: (show: boolean) => void;
}) => {
  const tooltipText = show ? "Hide section" : "Show section";
  const onClick = () => {
    setShow(!show);
  };
  const Icon = show ? Eye : EyeOff;

  return (
    <IconButton onClick={onClick} tooltipText={tooltipText}>
      <Icon className="h-[18px] w-[18px] text-white/60 group-hover:text-emerald-400 transition-colors" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{tooltipText}</span>
    </IconButton>
  );
};

type MoveIconButtonType = "up" | "down";
export const MoveIconButton = ({
  type,
  size = "medium",
  onClick,
}: {
  type: MoveIconButtonType;
  size?: "small" | "medium";
  onClick: (type: MoveIconButtonType) => void;
}) => {
  const tooltipText = type === "up" ? "Move up" : "Move down";
  const sizeClassName = size === "medium" ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]";
  const Icon = type === "up" ? ChevronUp : ChevronDown;

  return (
    <IconButton
      onClick={() => onClick(type)}
      tooltipText={tooltipText}
      size={size}
    >
      <Icon className={`${sizeClassName} text-white/60 group-hover:text-emerald-400 transition-colors`} strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{tooltipText}</span>
    </IconButton>
  );
};

export const DeleteIconButton = ({
  onClick,
  tooltipText,
}: {
  onClick: () => void;
  tooltipText: string;
}) => {
  return (
    <IconButton onClick={onClick} tooltipText={tooltipText} size="small">
      <Trash2 className="h-[14px] w-[14px] text-white/60 group-hover:text-red-400 transition-colors" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{tooltipText}</span>
    </IconButton>
  );
};

export const BulletListIconButton = ({
  onClick,
  showBulletPoints,
}: {
  onClick: (newShowBulletPoints: boolean) => void;
  showBulletPoints: boolean;
}) => {
  const tooltipText = showBulletPoints
    ? "Hide bullet points"
    : "Show bullet points";

  return (
    <IconButton
      onClick={() => onClick(!showBulletPoints)}
      tooltipText={tooltipText}
      size="small"
      className={showBulletPoints ? "!bg-emerald-400/15 !border-emerald-400/30 !text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]" : ""}
    >
      <List
        className={`h-[14px] w-[14px] ${
          showBulletPoints ? "text-emerald-400" : "text-white/60 group-hover:text-emerald-400 transition-colors"
        }`}
        strokeWidth={2.2}
        aria-hidden="true"
      />
      <span className="sr-only">{tooltipText}</span>
    </IconButton>
  );
};
