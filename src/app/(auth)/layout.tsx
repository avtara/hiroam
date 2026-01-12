import Link from "next/link";
import { FloatingFlags } from "@/components/landing/floating-flags";
import { JP, CH, FR, MY, AU, BR } from "country-flag-icons/react/3x2";
import Image from "next/image";
import { BorderedContainer } from "@/components/bordered-container";

const authFloatingFlagsConfig = [
  {
    flag: <MY />,
    finalLeft: "35%",
    finalTop: "25%",
    finalY: "0%",
    animationDelay: "0s",
    sizeClasses: "w-10",
  },
  {
    flag: <CH />,
    finalLeft: "70%",
    finalTop: "22%",
    finalY: "0%",
    animationDelay: "0.3s",
    sizeClasses: "w-10",
  },
  {
    flag: <FR />,
    finalLeft: "12%",
    finalTop: "42%",
    finalY: "0%",
    animationDelay: "0.5s",
    sizeClasses: "w-10",
  },
  {
    flag: <BR />,
    finalLeft: "55%",
    finalTop: "48%",
    finalY: "0%",
    animationDelay: "0.2s",
    sizeClasses: "w-10",
  },
  {
    flag: <AU />,
    finalLeft: "8%",
    finalTop: "68%",
    finalY: "0%",
    animationDelay: "0.7s",
    sizeClasses: "w-10",
  },
  {
    flag: <JP />,
    finalLeft: "35%",
    finalTop: "72%",
    finalY: "0%",
    animationDelay: "0.4s",
    sizeClasses: "w-10",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <BorderedContainer
        className="w-full max-w-4xl bg-border rounded-3xl"
        innerClassName="bg-gray-100"
      >
        {/* Card Container */}
        <div className="bg-white rounded-2xl overflow-hidden flex border">
          {/* Left Side - Form */}
          <div className="flex-1 p-8 md:p-12">{children}</div>

          {/* Right Side - Globe with Flags */}
          <div
            className="hidden md:block w-[360px] relative overflow-hidden rounded-r-3xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 1) 30%, rgba(206, 255, 243, 1) 100%)",
            }}
          >
            {/* Logo */}
            <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-4 h-4 text-white"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-lg font-bold">
                Hi<span className="text-teal-500">Roaming</span>
              </span>
            </div>

            {/* Globe Background Image - Bottom Right */}
            <Image
              src="/globe-full.png"
              width={800}
              height={800}
              alt="Globe"
              className="pointer-events-none absolute bottom-0 -right-24 scale-[2.5]"
            />

            {/* Floating Country Flags */}
            <FloatingFlags flags={authFloatingFlagsConfig} />
          </div>
        </div>
      </BorderedContainer>
    </div>
  );
}
