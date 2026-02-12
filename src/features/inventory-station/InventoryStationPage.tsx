//To try the possibilities of searching while learning
//Shows datas within this Inventory Management System
//Look for source base on the code you going to use
import React, { useState, useEffect } from "react";

function message() {
  return <p>Datas length not meet</p>;
}

function messaget() {
  return <p>Datas length met</p>;
}

export default function InventoryStation() {
  const [mockdata, setMockdata] = useState([
    { name: "Javasirs", sector: "A1", svc: 120, unsvc: 30 },
    { name: "Pythoria", sector: "B2", svc: 200, unsvc: 50 },
  ]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Sector</th>
            <th>Serviced Items</th>
            <th>Unserviced Items</th>
          </tr>
        </thead>

        <tbody>
          {mockdata.map((station, index) => (
            <tr key={index}>
              <td>{station.name}</td>
              <td>{station.sector}</td>
              <td>{station.svc}</td>
              <td>{station.unsvc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
{
  /* {mockdata.length > 1 messaget()} </div> */
}
{
  /* <div>
        {mockdata.length > 2
          ? "More than 3 stations"
          : "Less than or equal to 3 stations"}{" "}
      </div> */
}
