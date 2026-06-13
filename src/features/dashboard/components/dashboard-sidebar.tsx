"use client"

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationSwitcher, useClerk, UserButton } from "@clerk/nextjs";
import { AudioLines, Headphones, Home, LayoutGrid, Settings, Volume2, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
    title: string;
    url?: string;
    icon: LucideIcon;
    onClick?: () => void;
}

interface NavSectionProps {
    label?: string;
    items: MenuItem[];
    pathname: string;
}

function NavSection({ label, items, pathname }: NavSectionProps) {
    return (
        <SidebarGroup>
            {label && (
                <SidebarGroupLabel className="text-[13px] uppercase text-muted-foreground">
                    {label}
                </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild={!!item.url} 
                            isActive={
                                item.url
                                    ? item.url === "/" 
                                        ? pathname === "/" 
                                        : pathname.startsWith(item.url) 
                                    : false
                            }
                            onClick={item.onClick}
                            tooltip={item.title}
                            className="h-9 px-3 py-2 text-[13px] tracking-tight font-medium border border-transparent data-[active=true]:border-border data-[active=true]:shadow-[0px_1px_1px_0px_rgba(44,54,53,0.03),inset_0px_0px_0px_2px_white]"
                        >
                            {item.url ? (
                                <Link href={item.url}>
                                    <item.icon className="size-4" />
                                    <span>{item.title}</span>
                                </Link>
                            ) : (
                                <>
                                    <item.icon className="size-4" />
                                    <span>{item.title}</span>
                                </>
                            )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export function DashboardSidebar() {
    const pathname = usePathname();
    const clerk = useClerk();

    const mainMenuItems: MenuItem[] = [
        {
            title: "Dashboard",
            url: "/",
            icon: Home,
        },
        {
            title: "Explore voices",
            url: "/voices",
            icon: LayoutGrid,
        },
        {
            title: "Text to speech",
            url: "/text-to-speech",
            icon: AudioLines,
        },
        {
            title: "Voice cloning",
            icon: Volume2,
        },
    ];

    const otherMenuItems: MenuItem[] = [
        {
            title: "Settings",
            icon: Settings,
            onClick: () => clerk.openOrganizationProfile(),
        },
        {
            title: "Help & Support",
            url: "ankur.business10@gmail.com",
            icon: Headphones,
        }
    ]

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="flex flex-col gap-4 pt-4">
                <div className="flex items-center gap-2 pl-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
                    <Image src="/logo.svg" alt="resonance" width={24} height={24} className="rounded-sm"/>
                    <span className="group-data-[collapsible=icon]:hidden font-semibold text-lg tracking-tighter text-foreground">Resonance</span>

                    <SidebarTrigger className="ml-auto lg:hidden" />
                </div>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <OrganizationSwitcher 
                            hidePersonal 
                            fallback={<Skeleton className="w-full h-8.5 group-adta-[collapsible=icon]:size-8 rounded-md border bg-white"
                            />}
                            appearance={{
                                elements: {
                                  rootBox: 
                                    "w-full! group-data-[collapsible=icon]:w-auto! group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:justify-center!",
                                  organizationSwitcherTrigger:
                                    "w-full! justify-between! bg-white! border! border-border! rounded-md! pl-1! pr-2! py-1! gap-3! group-data-[collapsible=icon]:w-auto! group-data-[collapsible=icon]:p-1! shadow-[0px_1px_1.5px_0px_rgba(44,54,53,0.03)]!",
                                  organizationPreview: "gap-2!",
                                  organizationPreviewAvatarBox: "size-6! rounded-sm!",
                                  organizationPreviewTextContainer: 
                                    "text-xs! tracking-tight! font-medium! text-foreground! group-data-[collapsible=icon]:hidden!",
                                  organizationPreviewMainIdentifier: "text-[13px]!",
                                  organizationSwitcherTriggerIcon:
                                    "size-4! text-sidebar-foreground! group-data-[collapsible=icon]:hidden!",
                                },
                              }}
                        />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <div className="border-b border-border border-dashed"/>
            <SidebarContent>
                <NavSection items={mainMenuItems} pathname={pathname} />
                <NavSection label="Others" items={otherMenuItems} pathname={pathname} />
            </SidebarContent>
            <div className="border-b border-border border-dashed"/>

            <SidebarFooter className="gap-3 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserButton
                            showName
                            fallback={
                                <Skeleton className="h-8.5 w-full group-data-[collapsible=icon]:size-8 rounded-md border border-border bg-white" />
                            }
                            appearance={{
                                elements: {
                                rootBox:
                                    "w-full! group-data-[collapsible=icon]:w-auto! group-data-[collapsible=icon]:flex! group-data-[collapsible=icon]:justify-center!",
                                userButtonTrigger:
                                    "w-full! justify-between! bg-white! border! border-border! rounded-md! pl-1! pr-2! py-1! shadow-[0px_1px_1.5px_0px_rgba(44,54,53,0.03)]! group-data-[collapsible=icon]:w-auto! group-data-[collapsible=icon]:p-1! group-data-[collapsible=icon]:after:hidden! [--border:color-mix(in_srgb,transparent,var(--clerk-color-neutral,#000000)_15%)]!",
                                userButtonBox: "flex-row-reverse! gap-2!",
                                userButtonOuterIdentifier: "text-[13px]! tracking-tight! font-medium! text-foreground! pl-0! group-data-[collapsible=icon]:hidden!",
                                userButtonAvatarBox: "size-6!",
                                }
                            }}
                        />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail/>
        </Sidebar>
    )
}