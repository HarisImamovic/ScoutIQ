import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  BookmarkX, Search, Filter, SlidersHorizontal
} from "lucide-react";

interface Prospect {
  id: number;
  name: string;
  position: string;
  age: number;
  club: string;
  country: string;
  height: number;
  salary: number;
  rating: number;
  savedDate: string;
}

const initialProspects: Prospect[] = [
  { id: 3, name: "Endrick", position: "ST", age: 18, club: "Real Madrid", country: "Brazil", height: 174, salary: 65000, rating: 85, savedDate: "2026-03-14" },
  { id: 5, name: "Gavi", position: "CM", age: 21, club: "FC Barcelona", country: "Spain", height: 173, salary: 120000, rating: 87, savedDate: "2026-03-12" },
  { id: 4, name: "Mathys Tel", position: "CF", age: 19, club: "Bayern Munich", country: "France", height: 182, salary: 55000, rating: 84, savedDate: "2026-03-10" },
  { id: 7, name: "Bukayo Saka", position: "RW", age: 23, club: "Arsenal", country: "England", height: 178, salary: 300000, rating: 91, savedDate: "2026-03-08" },
  { id: 12, name: "Khvicha Kvaratskhelia", position: "LW", age: 23, club: "PSG", country: "Georgia", height: 183, salary: 180000, rating: 88, savedDate: "2026-03-05" },
  { id: 9, name: "Pedri", position: "CM", age: 22, club: "FC Barcelona", country: "Spain", height: 174, salary: 160000, rating: 89, savedDate: "2026-02-28" },
];

const positions = ["All", "ST", "CF", "RW", "LW", "AM", "CM", "CDM", "CB", "LB", "RB", "GK"];
const clubs = ["All", "Real Madrid", "FC Barcelona", "Bayern Munich", "Arsenal", "PSG", "Manchester City", "B. Leverkusen"];

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (!direction) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
  if (direction === "asc") return <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />;
  return <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
}

export default function SavedProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [clubFilter, setClubFilter] = useState("All");

  const unsave = (id: number) => setProspects((prev) => prev.filter((p) => p.id !== id));

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      const matchPos = posFilter === "All" || p.position === posFilter;
      const matchClub = clubFilter === "All" || p.club === clubFilter;
      const matchSearch = !globalFilter || p.name.toLowerCase().includes(globalFilter.toLowerCase()) || p.country.toLowerCase().includes(globalFilter.toLowerCase());
      return matchPos && matchClub && matchSearch;
    });
  }, [prospects, posFilter, clubFilter, globalFilter]);

  const columns: ColumnDef<Prospect>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          className="flex items-center text-left font-medium hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Player <SortIcon direction={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.country}</div>
        </div>
      ),
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{getValue() as string}</Badge>,
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <button
          className="flex items-center font-medium hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Age <SortIcon direction={column.getIsSorted()} />
        </button>
      ),
    },
    {
      accessorKey: "club",
      header: "Club",
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    },
    {
      accessorKey: "height",
      header: ({ column }) => (
        <button
          className="flex items-center font-medium hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Height <SortIcon direction={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => `${getValue()} cm`,
    },
    {
      accessorKey: "salary",
      header: ({ column }) => (
        <button
          className="flex items-center font-medium hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Salary/wk <SortIcon direction={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => `€${(getValue() as number).toLocaleString()}`,
    },
    {
      accessorKey: "rating",
      header: ({ column }) => (
        <button
          className="flex items-center font-medium hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rating <SortIcon direction={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-display font-bold text-primary">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "savedDate",
      header: "Saved",
      cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue() as string}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Remove from saved"
          onClick={() => unsave(row.original.id)}
        >
          <BookmarkX className="w-4 h-4" />
        </Button>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Saved Prospects</h1>
        <p className="text-muted-foreground mt-1">Your shortlisted players for recruitment</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            className="pl-10 bg-muted/50"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-muted/50">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((p) => <SelectItem key={p} value={p}>{p === "All" ? "All Positions" : p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clubFilter} onValueChange={setClubFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/50">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            {clubs.map((c) => <SelectItem key={c} value={c}>{c === "All" ? "All Clubs" : c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} prospect{filtered.length !== 1 ? "s" : ""}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} className="text-muted-foreground font-medium whitespace-nowrap">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                      No saved prospects yet. Save players from the Players page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
