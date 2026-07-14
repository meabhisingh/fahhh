import Image from "next/image";
import { appName } from "@/lib/shared";

export const Logo = () => {
	return (
		<div className="flex items-center gap-2 group">
			<Image src="/logo.svg" alt="Logo" width={32} height={32} quality={100} />
			<span className="font-bold text-lg tracking-tight">
				{appName} <span className="text-green-500">Docs</span>
			</span>
		</div>
	);
};
