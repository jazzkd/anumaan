"use client";

import { ErrorNote, Spinner, TableStatusTag } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { sendMutation, useLiveData } from "@/lib/useLiveData";
import type { RestaurantTable, TableStatus } from "@/lib/types";

const CYCLE: TableStatus[] = ["empty", "seated", "bill_requested", "cleaning"];

/** A list, not a floor plan — the floor-plan visual is deferred in the PRD's
 *  own open questions and is not scored. */
export default function TablesPage() {
  const { data, error, isLoading, mutate } = useLiveData<RestaurantTable[]>("/api/tables");
  const { t } = useT();

  async function cycle(table: RestaurantTable) {
    const i = CYCLE.indexOf(table.status);
    await sendMutation(`/api/tables/${table.id}`, "PATCH", {
      status: CYCLE[(i + 1) % CYCLE.length],
    });
    await mutate();
  }

  return (
    <>
      <h3>{t("tables")}</h3>
      <ErrorNote error={error} />
      {isLoading && !data ? <Spinner /> : null}

      <table className="table">
        <thead>
          <tr>
            <th>{t("table")}</th>
            <th>Seats</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((table) => (
            <tr key={table.id}>
              <td className="font-[var(--font-heading)] font-extrabold">{table.label}</td>
              <td className="text-muted">{table.seats}</td>
              <td>
                <TableStatusTag status={table.status} />
              </td>
              <td className="text-right">
                <button className="btn btn-secondary" onClick={() => cycle(table)}>
                  {t("cycle")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
