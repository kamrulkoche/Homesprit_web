import httpRequest from '@/services/api/httpRequest';
import { toApiQuery } from '@/helpers/properties/search-params';
import type { IPaginated } from '@/interface/admin.interface';
import type {
  ICityCount,
  IProperty,
  IPropertySearch,
} from '@/interface/property.interface';

/**
 * Browser-side reads for the Redux/saga layer.
 *
 * The class-with-singleton-export shape and the rule that a service method only
 * issues the request and returns the envelope — no unwrapping, no mapping, no
 * error handling, the saga owns all three — are the reference's, via
 * hgs-frontend's `services/api/services.service.ts`. It sits in `services/api/`
 * for the reason HGS gives: `services/property.service.ts` is already the
 * server-side reader for the same endpoints.
 */
class PropertiesService {
  /** One page of the public search. */
  searchProperties(search: IPropertySearch) {
    return httpRequest.get<IPaginated<IProperty>>('/properties', toApiQuery(search));
  }

  /** The city picker's options. */
  getCities() {
    return httpRequest.get<ICityCount[]>('/properties/cities');
  }
}

const propertiesApiService = new PropertiesService();
export default propertiesApiService;
