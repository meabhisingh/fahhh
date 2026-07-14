import { clsx } from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "outline" | "danger";
};

const variants = {
	primary:
		"text-black bg-linear-to-b from-green-400 to-green-500 hover:bg-linear-to-b hover:from-green-400/90 hover:to-green-500/90  shadow-[0_6px_0_rgb(29,140,0)]",
	secondary:
		"bg-gray-200 hover:bg-gray-100 text-gray-800 shadow-[0_6px_0_rgb(156,163,175)]",
	danger:
		"bg-red-600 hover:bg-red-500 text-white shadow-[0_6px_0_rgb(150,0,0)]",
	outline:
		"bg-transparent border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white shadow-[0_6px_0_rgb(29,140,0)]",
};

export const Button = ({
	children = "FAHHH",
	className = "",
	onClick,
	variant = "primary",
	...props
}: ButtonProps) => {
	return (
		<button
			type="button"
			onClick={onClick}
			className={clsx(
				"relative  cursor-pointer px-6 py-3 rounded-xl font-semibold transition-all duration-100 ease-in-out active:translate-y-1.5 active:shadow-none",
				variants[variant],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
};
