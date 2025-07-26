import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  scoreFilter: string;
  onScoreFilterChange: (filter: string) => void;
  bookmarkedOnly: boolean;
  onBookmarkedOnlyChange: (bookmarked: boolean) => void;
  totalResults: number;
  filteredResults: number;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchTerm,
  onSearchChange,
  scoreFilter,
  onScoreFilterChange,
  bookmarkedOnly,
  onBookmarkedOnlyChange,
  totalResults,
  filteredResults
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const clearAllFilters = () => {
    onSearchChange('');
    onScoreFilterChange('all');
    onBookmarkedOnlyChange(false);
  };

  const hasActiveFilters = searchTerm || scoreFilter !== 'all' || bookmarkedOnly;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search through exploration steps..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Quality Filter</label>
              <select
                value={scoreFilter}
                onChange={(e) => onScoreFilterChange(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="all">All Steps</option>
                <option value="high">High Quality (≥8)</option>
                <option value="medium">Medium Quality (6-7)</option>
                <option value="low">Low Quality (&lt;6)</option>
                <option value="breakthrough">Breakthrough Moments</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bookmarked"
                checked={bookmarkedOnly}
                onChange={(e) => onBookmarkedOnlyChange(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="bookmarked" className="text-sm font-medium">
                Show only bookmarked steps
              </label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {filteredResults} of {totalResults} steps</span>
          {searchTerm && <Badge variant="secondary">Search: "{searchTerm}"</Badge>}
          {scoreFilter !== 'all' && <Badge variant="secondary">Quality: {scoreFilter}</Badge>}
          {bookmarkedOnly && <Badge variant="secondary">Bookmarked</Badge>}
        </div>
      )}
    </div>
  );
};