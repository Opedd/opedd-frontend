import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#040042] group-[.toaster]:border-[#E5E7EB] group-[.toaster]:shadow-sm group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-[#6B7280]",
          actionButton: "group-[.toast]:bg-[#4A26ED] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[#F3F4F6] group-[.toast]:text-[#6B7280]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
