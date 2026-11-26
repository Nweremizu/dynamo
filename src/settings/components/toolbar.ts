import { createContext, useContext } from "react";

/** Lets a page's header hand its title to the toolbar, which shows it once the header scrolls away. */
export const ToolbarTitle = createContext<(title: string) => void>(() => {});

export const useToolbarTitle = () => useContext(ToolbarTitle);
