import { cx } from "lib/cx";
import { Tooltip } from "components/Tooltip";

type ReactButtonProps = React.ComponentProps<"button">;
type ReactAnchorProps = React.ComponentProps<"a">;
type ButtonProps = ReactButtonProps | ReactAnchorProps;

const isAnchor = (props: ButtonProps): props is ReactAnchorProps => {
  return "href" in props;
};

export const Button = (props: ButtonProps) => {
  if (isAnchor(props)) {
    return <a {...props} />;
  } else {
    return <button type="button" {...props} />;
  }
};

export const PrimaryButton = ({ className, ...props }: ButtonProps) => (
  <Button className={cx("btn-primary", className)} {...props} />
);

type IconButtonProps = ButtonProps & {
  size?: "small" | "medium";
  tooltipText: string;
};

export const IconButton = ({
  className,
  size = "medium",
  tooltipText,
  ...props
}: IconButtonProps) => (
  <Tooltip text={tooltipText}>
    <Button
      type="button"
      className={cx(
        "group rounded-xl border border-white/10 bg-white/5 text-white/70 shadow-md backdrop-blur-md hover:bg-white/10 hover:border-white/20 hover:text-white focus-visible:bg-white/10 active:scale-90 transition-all duration-150 flex items-center justify-center",
        size === "medium" ? "p-1.5" : "p-1",
        className
      )}
      {...props}
    />
  </Tooltip>
);
