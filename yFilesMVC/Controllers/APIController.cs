using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace yFilesMVC.Controllers
{
    public class Person
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
    }

    public class APIController : ApiController
    {
        [HttpGet]
        [Route("API/GetRoot")]
        public Person GetRoot()
        {
            return new Person
                       {
                           FirstName = Faker.Name.First(),
                           LastName = Faker.Name.Last()
                       };
        }
    }
}
