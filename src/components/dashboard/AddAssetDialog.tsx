import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description: string; licenseType: string }) => void;
}

export function AddAssetDialog({ open, onOpenChange, onSubmit }: AddAssetDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [licenseType, setLicenseType] = useState("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ title, description, licenseType });
      setTitle("");
      setDescription("");
      setLicenseType("standard");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#040042]/10 text-[#040042] sm:max-w-lg rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#040042]">
            Register New Asset
          </DialogTitle>
          <DialogDescription className="text-[#040042]/60">
            Add your content to the sovereign registry for licensing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[#040042]/80 font-medium">
              Asset Title
            </Label>
            <Input
              id="title"
              placeholder="e.g. The Future of AI Governance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 rounded-xl h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[#040042]/80 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of your content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 rounded-xl min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseType" className="text-[#040042]/80 font-medium">
              License Type
            </Label>
            <Select value={licenseType} onValueChange={setLicenseType}>
              <SelectTrigger className="bg-[#F2F9FF] border-[#040042]/10 text-[#040042] rounded-xl h-12">
                <SelectValue placeholder="Select license type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#040042]/10">
                <SelectItem value="standard">Standard License</SelectItem>
                <SelectItem value="exclusive">Exclusive License</SelectItem>
                <SelectItem value="creative-commons">Creative Commons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !title}
            className="w-full h-14 rounded-xl font-semibold text-base bg-[#D1009A] hover:bg-[#B8008A] text-white transition-all active:scale-[0.98]"
          >
            {isSubmitting ? "Registering..." : "Register Asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
