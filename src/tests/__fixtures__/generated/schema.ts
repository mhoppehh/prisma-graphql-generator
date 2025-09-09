export default `type Employee {
  Address: String 
  BirthDate: String 
  City: String 
  Country: String 
  Extension: String 
  FirstName: String 
  HireDate: String 
  HomePhone: String 
  Id: Int! 
  LastName: String 
  Notes: String 
  Photo: String 
  PhotoPath: String 
  PostalCode: String 
  Region: String 
  ReportsTo: Int 
  Title: String 
  TitleOfCourtesy: String 
}

type Category {
  CategoryName: String 
  Description: String 
  Id: Int! 
}

type Customer {
  Address: String 
  City: String 
  CompanyName: String 
  ContactName: String 
  ContactTitle: String 
  Country: String 
  Fax: String 
  Id: String! 
  Phone: String 
  PostalCode: String 
  Region: String 
}

type Shipper {
  CompanyName: String 
  Id: Int! 
  Phone: String 
}

type Supplier {
  Address: String 
  City: String 
  CompanyName: String 
  ContactName: String 
  ContactTitle: String 
  Country: String 
  Fax: String 
  HomePage: String 
  Id: Int! 
  Phone: String 
  PostalCode: String 
  Region: String 
}

type Order {
  CustomerId: String 
  EmployeeId: Int! 
  Freight: String! 
  Id: Int! 
  OrderDate: String 
  RequiredDate: String 
  ShipAddress: String 
  ShipCity: String 
  ShipCountry: String 
  ShipName: String 
  ShipPostalCode: String 
  ShipRegion: String 
  ShipVia: Int 
  ShippedDate: String 
}

type Product {
  CategoryId: Int! 
  Discontinued: Int! 
  Id: Int! 
  ProductName: String 
  QuantityPerUnit: String 
  ReorderLevel: Int! 
  SupplierId: Int! 
  UnitPrice: String! 
  UnitsInStock: Int! 
  UnitsOnOrder: Int! 
}

type OrderDetail {
  Discount: Float! 
  Id: String! 
  OrderId: Int! 
  ProductId: Int! 
  Quantity: Int! 
  UnitPrice: String! 
}

type CustomerCustomerDemo {
  CustomerTypeId: String 
  Id: String! 
}

type CustomerDemographic {
  CustomerDesc: String 
  Id: String! 
}

type Region {
  Id: Int! 
  RegionDescription: String 
}

type Territory {
  Id: String! 
  RegionId: Int! 
  TerritoryDescription: String 
}

type EmployeeTerritory {
  EmployeeId: Int! 
  Id: String! 
  TerritoryId: String 
}

`