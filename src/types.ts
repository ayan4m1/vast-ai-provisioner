export type Offer = {
  direct_port_count: number;
  disk_bw: number;
  dlperf_per_dphtotal: number;
  end_date: number;
  geolocation: string;
  gpu_name: string;
  gpu_ram: number;
  id: number;
  inet_down: number;
  search: {
    gpuCostPerHour: number;
    diskHour: number;
    totalHour: number;
  };
};

export type Offers = {
  offers: Offer[];
};

export enum RunType {
  SSH = 'ssh',
  Jupyter = 'jupyter',
  Args = 'args'
}

export type ModuleDependencies = Partial<Record<string, string[]>>;

export type Module = {
  description: string;
  files: ModuleDependencies;
  name: string;
  template: string;
  fileSizes: Map<string, number>;
  totalSize: number;
};

export type Template = {
  description?: string;
  environment?: Record<string, string>;
  fileTypes: string[];
  hash?: string;
  name: string;
  runType?: RunType;
  script?: string;
  size: number;
  tag?: string;
};

export type CreateInstanceRequest = {
  cancel_unavail: boolean;
  disk: number;
  extra_env: Record<string, string>;
  image?: string;
  runtype?: RunType;
  target_state: 'running';
  template_hash_id?: string;
  vm: boolean;
};

export type CreateInstanceResponse = {
  new_contract?: number;
  success: boolean;
};

export type ProvisionOptions = {
  maxHourlyCost: number;
  maxPorts: number;
  minVram: number;
  template?: string;
};
