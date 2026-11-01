import { Settings, memoryStore } from "../src/core/settings";
import { mountMobilePanel } from "../src/mobile/panel";

mountMobilePanel(new Settings(memoryStore()), async () => true);
