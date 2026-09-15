type IngressCardConfig = {
  type: string;
  url?: string;
  title?: string;
  addon?: string;
  panel?: string;
  height?: string;
  aspect_ratio?: string;
  allow?: string;
  sandbox?: string;
};

type HassPanelInfo = {
  component_name?: string;
  config?: {addon?: string; url?: string; [key: string]: unknown};
  icon?: string | null;
  title?: string | null;
  url_path?: string;
  [key: string]: unknown;
};

type AddonInfo = {
  ingress_url?: string;
  ingress_entry?: string;
  version?: string;
  state?: string;
  [key: string]: unknown;
};

type HomeAssistant = {
  panels?: Record<string, HassPanelInfo>;
  connection: {
    subscribeMessage: <T>(
      callback: (result: T) => void,
      params: Record<string, unknown>,
    ) => Promise<() => void>;
  };
  callWS: <T>(params: {
    type: string;
    endpoint?: string;
    method?: string;
    [key: string]: unknown;
  }) => Promise<T>;
};

type CustomCardInfo = {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
};

export type {
  AddonInfo,
  CustomCardInfo,
  HassPanelInfo,
  HomeAssistant,
  IngressCardConfig,
};
