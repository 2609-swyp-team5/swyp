"use client";

import { Label } from "@/common/components/ui/Label";
import { Switch } from "@/common/components/ui/Switch";
import { MyPanel } from "@/features/my/components/MyPageContent";

type NotificationGroupProps = {
    group: { title: string; items: { id: string; title: string; description: string }[] };
    enabled: Record<string, boolean>;
    onCheckedChange: (id: string, enabled: boolean) => void;
    disabled?: boolean;
};

export function NotificationGroup({
    group,
    enabled,
    onCheckedChange,
    disabled = false,
}: NotificationGroupProps) {
    return (
        <MyPanel className="p-0">
            <h2 className="bg-muted/50 text-muted-foreground border-b px-6 py-4 text-[13px] leading-5 font-semibold">
                {group.title}
            </h2>
            <div className="divide-y">
                {group.items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between gap-5 px-6 py-5"
                    >
                        <div className="min-w-0">
                            <Label
                                htmlFor={item.id}
                                className="text-base leading-[25px] font-semibold"
                            >
                                {item.title}
                            </Label>
                            <p
                                id={item.id + "-description"}
                                className="text-muted-foreground mt-1 text-[13px] leading-5"
                            >
                                {item.description}
                            </p>
                        </div>
                        <Switch
                            id={item.id}
                            checked={enabled[item.id] ?? false}
                            disabled={disabled}
                            onCheckedChange={(value) => onCheckedChange(item.id, value)}
                            aria-describedby={item.id + "-description"}
                            className="data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5 [&_[data-slot=switch-thumb][data-state=checked]]:translate-x-[22px]"
                        />
                    </div>
                ))}
            </div>
        </MyPanel>
    );
}
