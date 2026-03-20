import { useQuery } from "@tanstack/react-query";
import { 
  fetchCatalog, 
  searchCatalog, 
  fetchSeriesDetail, 
  fetchEpisodes 
} from "../lib/apiClient";

export function useCatalog(kind, page = 1) {
  return useQuery({
    queryKey: ["catalog", kind, page],
    queryFn: () => fetchCatalog(kind, page),
  });
}

export function useSearch(query) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchCatalog(query),
    enabled: query.length > 0,
  });
}

export function useSeriesDetail(seriesId) {
  return useQuery({
    queryKey: ["series", seriesId],
    queryFn: () => fetchSeriesDetail(seriesId),
    enabled: !!seriesId,
  });
}

export function useEpisodes(seriesId) {
  return useQuery({
    queryKey: ["episodes", seriesId],
    queryFn: () => fetchEpisodes(seriesId),
    enabled: !!seriesId,
  });
}
